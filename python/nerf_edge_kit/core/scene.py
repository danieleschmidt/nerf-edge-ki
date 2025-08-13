"""
Scene representation and management for NeRF training and inference.

This module provides classes for managing scene data including:
- Camera poses and intrinsics
- Image data and preprocessing
- Bounding volume management
- Ray generation and sampling
"""

import os
import json
import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import Dataset
from typing import Optional, List, Tuple, Dict, Any, Union
from pathlib import Path
import cv2
from PIL import Image

from .config import SceneConfig


class Camera:
    """Represents a single camera with pose and intrinsic parameters."""
    
    def __init__(
        self, 
        pose: np.ndarray,
        intrinsics: np.ndarray,
        image_width: int,
        image_height: int,
        image_path: Optional[str] = None
    ):
        """
        Initialize camera.
        
        Args:
            pose: 4x4 camera-to-world transformation matrix
            intrinsics: 3x3 camera intrinsic matrix
            image_width: Image width in pixels
            image_height: Image height in pixels
            image_path: Path to associated image file
        """
        self.pose = torch.tensor(pose, dtype=torch.float32)
        self.intrinsics = torch.tensor(intrinsics, dtype=torch.float32)
        self.image_width = image_width
        self.image_height = image_height
        self.image_path = image_path
        
        # Derived properties
        self.focal_length = float(intrinsics[0, 0])
        self.center_x = float(intrinsics[0, 2])
        self.center_y = float(intrinsics[1, 2])
        
    def get_rays(self, device: str = "cpu") -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Generate rays for all pixels in this camera.
        
        Returns:
            rays_o: Ray origins (H, W, 3)
            rays_d: Ray directions (H, W, 3)
        """
        i, j = torch.meshgrid(
            torch.linspace(0, self.image_width - 1, self.image_width, device=device),
            torch.linspace(0, self.image_height - 1, self.image_height, device=device),
            indexing='ij'
        )
        i = i.t()
        j = j.t()
        
        # Pixel coordinates to camera coordinates
        dirs = torch.stack([
            (i - self.center_x) / self.focal_length,
            -(j - self.center_y) / self.focal_length,
            -torch.ones_like(i)
        ], -1)
        
        # Transform to world coordinates
        pose = self.pose.to(device)
        rays_d = torch.sum(dirs[..., None, :] * pose[:3, :3], -1)
        rays_o = pose[:3, -1].expand(rays_d.shape)
        
        return rays_o, rays_d
    
    def project_points(self, points: torch.Tensor) -> torch.Tensor:
        """
        Project 3D points to image coordinates.
        
        Args:
            points: 3D points (N, 3)
            
        Returns:
            image_coords: 2D image coordinates (N, 2)
        """
        # Transform to camera coordinates
        points_cam = torch.matmul(points - self.pose[:3, 3], self.pose[:3, :3])
        
        # Project to image plane
        points_2d = points_cam[:, :2] / points_cam[:, 2:3]
        image_coords = torch.matmul(points_2d, self.intrinsics[:2, :2].T) + self.intrinsics[:2, 2]
        
        return image_coords


class Scene:
    """Scene representation containing cameras, images, and metadata."""
    
    def __init__(self, config: SceneConfig):
        """Initialize scene with configuration."""
        self.config = config
        self.cameras: List[Camera] = []
        self.images: List[torch.Tensor] = []
        self.bounds = config.get_bounds_tensor()
        self.camera_count = 0
        
        # Scene statistics
        self.scene_center = torch.zeros(3)
        self.scene_scale = 1.0
        
    @classmethod
    def from_colmap(cls, data_path: str, config: SceneConfig) -> 'Scene':
        """
        Load scene from COLMAP reconstruction format.
        
        Args:
            data_path: Path to COLMAP reconstruction directory
            config: Scene configuration
            
        Returns:
            Scene instance
        """
        scene = cls(config)
        
        # Load COLMAP data
        cameras_file = os.path.join(data_path, "cameras.txt")
        images_file = os.path.join(data_path, "images.txt")
        points_file = os.path.join(data_path, "points3D.txt")
        
        if not all(os.path.exists(f) for f in [cameras_file, images_file]):
            raise FileNotFoundError("COLMAP files not found")
        
        # Parse camera intrinsics
        intrinsics_map = scene._parse_colmap_cameras(cameras_file)
        
        # Parse camera poses and images
        poses, image_paths = scene._parse_colmap_images(images_file, intrinsics_map)
        
        # Load images
        for i, (pose, image_path) in enumerate(zip(poses, image_paths)):
            full_image_path = os.path.join(data_path, "images", image_path)
            
            if os.path.exists(full_image_path):
                # Load and preprocess image
                image = scene._load_image(full_image_path)
                scene.images.append(image)
                
                # Create camera
                intrinsics = intrinsics_map[1]  # Assuming single camera model
                camera = Camera(
                    pose=pose,
                    intrinsics=intrinsics,
                    image_width=config.image_width,
                    image_height=config.image_height,
                    image_path=full_image_path
                )
                scene.cameras.append(camera)
        
        scene.camera_count = len(scene.cameras)
        scene._compute_scene_bounds()
        
        return scene
    
    @classmethod
    def from_transforms_json(cls, transforms_path: str, config: SceneConfig) -> 'Scene':
        """
        Load scene from transforms.json format (NeRF synthetic dataset).
        
        Args:
            transforms_path: Path to transforms.json file
            config: Scene configuration
            
        Returns:
            Scene instance
        """
        scene = cls(config)
        
        with open(transforms_path, 'r') as f:
            data = json.load(f)
        
        # Extract camera parameters
        if 'camera_angle_x' in data:
            focal_length = 0.5 * config.image_width / np.tan(0.5 * data['camera_angle_x'])
        else:
            focal_length = data.get('fl_x', config.image_width * 0.7)
        
        intrinsics = np.array([
            [focal_length, 0, config.image_width / 2],
            [0, focal_length, config.image_height / 2],
            [0, 0, 1]
        ])
        
        # Load frames
        data_dir = os.path.dirname(transforms_path)
        for frame in data['frames']:
            # Load image
            image_path = os.path.join(data_dir, frame['file_path'])
            if not image_path.endswith(('.png', '.jpg', '.jpeg')):
                image_path += '.png'
            
            if os.path.exists(image_path):
                image = scene._load_image(image_path)
                scene.images.append(image)
                
                # Create camera
                pose = np.array(frame['transform_matrix'])
                camera = Camera(
                    pose=pose,
                    intrinsics=intrinsics,
                    image_width=config.image_width,
                    image_height=config.image_height,
                    image_path=image_path
                )
                scene.cameras.append(camera)
        
        scene.camera_count = len(scene.cameras)
        scene._compute_scene_bounds()
        
        return scene
    
    def generate_rays(
        self, 
        camera_indices: Optional[List[int]] = None,
        num_rays: int = 4096,
        device: str = "cpu"
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Generate random rays from specified cameras.
        
        Args:
            camera_indices: Cameras to sample from (None for all)
            num_rays: Number of rays to generate
            device: Target device
            
        Returns:
            rays_o: Ray origins (num_rays, 3)
            rays_d: Ray directions (num_rays, 3)
            rgb: Target colors (num_rays, 3)
        """
        if camera_indices is None:
            camera_indices = list(range(len(self.cameras)))
        
        rays_o_list = []
        rays_d_list = []
        rgb_list = []
        
        rays_per_camera = num_rays // len(camera_indices)
        
        for idx in camera_indices:
            camera = self.cameras[idx]
            image = self.images[idx].to(device)
            
            # Generate all rays for this camera
            rays_o, rays_d = camera.get_rays(device)
            
            # Randomly sample pixels
            H, W = rays_o.shape[:2]
            coords = torch.randint(0, H, (rays_per_camera,), device=device), \
                    torch.randint(0, W, (rays_per_camera,), device=device)
            
            rays_o_list.append(rays_o[coords])
            rays_d_list.append(rays_d[coords])
            rgb_list.append(image[coords])
        
        rays_o = torch.cat(rays_o_list, 0)
        rays_d = torch.cat(rays_d_list, 0)
        rgb = torch.cat(rgb_list, 0)
        
        return rays_o, rays_d, rgb
    
    def get_camera_centers(self) -> torch.Tensor:
        """Get all camera center positions."""
        centers = torch.stack([camera.pose[:3, 3] for camera in self.cameras])
        return centers
    
    def normalize_scene(self):
        """Normalize scene to unit cube centered at origin."""
        camera_centers = self.get_camera_centers()
        
        # Compute scene center and scale
        self.scene_center = camera_centers.mean(0)
        distances = torch.norm(camera_centers - self.scene_center, dim=1)
        self.scene_scale = distances.max() * 1.2  # Add some margin
        
        # Update camera poses
        for camera in self.cameras:
            camera.pose[:3, 3] = (camera.pose[:3, 3] - self.scene_center) / self.scene_scale
        
        # Update bounds
        self.bounds = torch.tensor([[-1, -1, -1], [1, 1, 1]], dtype=torch.float32)
    
    def _load_image(self, image_path: str) -> torch.Tensor:
        """Load and preprocess an image."""
        image = Image.open(image_path).convert('RGB')
        
        # Resize if needed
        target_size = self.config.get_image_size()
        if image.size != target_size:
            image = image.resize(target_size, Image.LANCZOS)
        
        # Convert to tensor
        image_tensor = torch.from_numpy(np.array(image)).float() / 255.0
        
        # Handle white background
        if self.config.use_white_background and image_tensor.shape[-1] == 4:
            alpha = image_tensor[..., 3:4]
            image_tensor = image_tensor[..., :3] * alpha + (1 - alpha)
        
        return image_tensor
    
    def _parse_colmap_cameras(self, cameras_file: str) -> Dict[int, np.ndarray]:
        """Parse COLMAP cameras.txt file."""
        intrinsics_map = {}
        
        with open(cameras_file, 'r') as f:
            for line in f:
                if line.startswith('#'):
                    continue
                
                parts = line.strip().split()
                camera_id = int(parts[0])
                model = parts[1]
                width = int(parts[2])
                height = int(parts[3])
                
                if model == 'PINHOLE':
                    fx, fy, cx, cy = map(float, parts[4:8])
                    intrinsics = np.array([
                        [fx, 0, cx],
                        [0, fy, cy],
                        [0, 0, 1]
                    ])
                    intrinsics_map[camera_id] = intrinsics
        
        return intrinsics_map
    
    def _parse_colmap_images(
        self, 
        images_file: str, 
        intrinsics_map: Dict[int, np.ndarray]
    ) -> Tuple[List[np.ndarray], List[str]]:
        """Parse COLMAP images.txt file."""
        poses = []
        image_paths = []
        
        with open(images_file, 'r') as f:
            lines = f.readlines()
        
        for i in range(0, len(lines), 2):
            if lines[i].startswith('#'):
                continue
            
            # Parse pose
            parts = lines[i].strip().split()
            qw, qx, qy, qz = map(float, parts[1:5])
            tx, ty, tz = map(float, parts[5:8])
            image_name = parts[9]
            
            # Convert quaternion to rotation matrix
            R = self._quat_to_rotmat([qw, qx, qy, qz])
            t = np.array([tx, ty, tz])
            
            # COLMAP uses camera-to-world convention
            pose = np.eye(4)
            pose[:3, :3] = R
            pose[:3, 3] = t
            
            poses.append(pose)
            image_paths.append(image_name)
        
        return poses, image_paths
    
    def _quat_to_rotmat(self, quat: List[float]) -> np.ndarray:
        """Convert quaternion to rotation matrix."""
        w, x, y, z = quat
        
        return np.array([
            [1 - 2*y*y - 2*z*z, 2*x*y - 2*z*w, 2*x*z + 2*y*w],
            [2*x*y + 2*z*w, 1 - 2*x*x - 2*z*z, 2*y*z - 2*x*w],
            [2*x*z - 2*y*w, 2*y*z + 2*x*w, 1 - 2*x*x - 2*y*y]
        ])
    
    def _compute_scene_bounds(self):
        """Compute tight bounding box around scene."""
        if not self.cameras:
            return
        
        camera_centers = self.get_camera_centers()
        min_bounds = camera_centers.min(0)[0]
        max_bounds = camera_centers.max(0)[0]
        
        # Add margin
        margin = (max_bounds - min_bounds) * 0.1
        min_bounds -= margin
        max_bounds += margin
        
        self.bounds = torch.stack([min_bounds, max_bounds])


class NerfDataset(Dataset):
    """PyTorch dataset for NeRF training."""
    
    def __init__(self, scene: Scene, rays_per_batch: int = 4096):
        """
        Initialize dataset.
        
        Args:
            scene: Scene instance
            rays_per_batch: Number of rays per batch
        """
        self.scene = scene
        self.rays_per_batch = rays_per_batch
        
    def __len__(self) -> int:
        """Return number of batches per epoch."""
        total_pixels = sum(cam.image_width * cam.image_height for cam in self.scene.cameras)
        return total_pixels // self.rays_per_batch
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        """Get a batch of rays and target colors."""
        rays_o, rays_d, rgb = self.scene.generate_rays(num_rays=self.rays_per_batch)
        
        return {
            'rays_o': rays_o,
            'rays_d': rays_d,
            'rgb': rgb
        }