"""
Instant Neural Graphics Primitives (Instant-NGP) implementation.

This module provides a fast NeRF implementation based on:
"Instant Neural Graphics Primitives with a Multiresolution Hash Encoding"
by Müller et al., 2022.

Key features:
- Multiresolution hash encoding for positions
- Spherical harmonics encoding for directions  
- Small MLPs for fast inference
- Optimized for real-time rendering
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Tuple, Optional, Dict, Any

from ..core.config import ModelConfig
from ..core.scene import Scene
from .nerf import NerfModel


class HashEncoding(nn.Module):
    """Multiresolution hash encoding for position coordinates."""
    
    def __init__(
        self,
        num_levels: int = 16,
        base_resolution: int = 16,
        max_resolution: int = 2048,
        log2_hashmap_size: int = 19,
        feature_dim: int = 2
    ):
        """
        Initialize hash encoding.
        
        Args:
            num_levels: Number of resolution levels
            base_resolution: Base grid resolution
            max_resolution: Maximum grid resolution
            log2_hashmap_size: Log2 of hash table size
            feature_dim: Feature dimension per hash table entry
        """
        super().__init__()
        
        self.num_levels = num_levels
        self.base_resolution = base_resolution
        self.max_resolution = max_resolution
        self.feature_dim = feature_dim
        self.hashmap_size = 2 ** log2_hashmap_size
        
        # Growth factor between levels
        self.growth_factor = np.exp(
            (np.log(max_resolution) - np.log(base_resolution)) / (num_levels - 1)
        )
        
        # Hash table parameters
        self.hash_table = nn.Parameter(
            torch.randn(self.hashmap_size, feature_dim) * 1e-4
        )
        
        # Precompute resolutions for each level
        resolutions = []
        for level in range(num_levels):
            resolution = int(base_resolution * (self.growth_factor ** level))
            resolution = min(resolution, max_resolution)
            resolutions.append(resolution)
        
        self.register_buffer('resolutions', torch.tensor(resolutions, dtype=torch.int32))
        
        # Hash function parameters
        self.register_buffer('primes', torch.tensor([1, 2654435761, 805459861], dtype=torch.int64))
    
    def forward(self, positions: torch.Tensor) -> torch.Tensor:
        """
        Encode positions using multiresolution hash encoding.
        
        Args:
            positions: Input positions (N, 3) in [-1, 1]
            
        Returns:
            Encoded features (N, num_levels * feature_dim)
        """
        batch_size = positions.shape[0]
        device = positions.device
        
        # Normalize positions to [0, 1]
        positions = (positions + 1.0) * 0.5
        
        encoded_features = []
        
        for level in range(self.num_levels):
            resolution = self.resolutions[level].item()
            
            # Scale positions to current resolution
            scaled_pos = positions * (resolution - 1)
            
            # Get grid coordinates
            grid_pos = torch.floor(scaled_pos).long()
            
            # Get interpolation weights
            weights = scaled_pos - grid_pos.float()
            
            # Get 8 corner vertices of the cube
            corners = []
            for i in range(2):
                for j in range(2):
                    for k in range(2):
                        corner = grid_pos + torch.tensor([i, j, k], device=device)
                        corners.append(corner)
            
            # Hash corner positions and lookup features
            corner_features = []
            for corner in corners:
                hash_idx = self._hash_position(corner, resolution)
                features = self.hash_table[hash_idx]
                corner_features.append(features)
            
            # Trilinear interpolation
            interpolated = self._trilinear_interpolate(corner_features, weights)
            encoded_features.append(interpolated)
        
        return torch.cat(encoded_features, dim=-1)
    
    def _hash_position(self, positions: torch.Tensor, resolution: int) -> torch.Tensor:
        """Hash 3D grid positions to hash table indices."""
        # Clamp positions to valid range
        positions = torch.clamp(positions, 0, resolution - 1)
        
        # Hash function: (x * p1) ^ (y * p2) ^ (z * p3)
        hash_val = positions[..., 0] * self.primes[0]
        hash_val ^= positions[..., 1] * self.primes[1]
        hash_val ^= positions[..., 2] * self.primes[2]
        
        # Modulo hash table size
        hash_idx = hash_val % self.hashmap_size
        
        return hash_idx
    
    def _trilinear_interpolate(
        self, 
        corner_features: list, 
        weights: torch.Tensor
    ) -> torch.Tensor:
        """Perform trilinear interpolation of corner features."""
        # Extract interpolation weights
        wx, wy, wz = weights[..., 0:1], weights[..., 1:2], weights[..., 2:3]
        
        # Trilinear interpolation
        c000, c001, c010, c011 = corner_features[0], corner_features[1], corner_features[2], corner_features[3]
        c100, c101, c110, c111 = corner_features[4], corner_features[5], corner_features[6], corner_features[7]
        
        # Interpolate along x
        c00 = c000 * (1 - wx) + c100 * wx
        c01 = c001 * (1 - wx) + c101 * wx
        c10 = c010 * (1 - wx) + c110 * wx
        c11 = c011 * (1 - wx) + c111 * wx
        
        # Interpolate along y
        c0 = c00 * (1 - wy) + c10 * wy
        c1 = c01 * (1 - wy) + c11 * wy
        
        # Interpolate along z
        result = c0 * (1 - wz) + c1 * wz
        
        return result


class SphericalHarmonicsEncoding(nn.Module):
    """Spherical harmonics encoding for direction vectors."""
    
    def __init__(self, degree: int = 4):
        """
        Initialize spherical harmonics encoding.
        
        Args:
            degree: Maximum degree of spherical harmonics
        """
        super().__init__()
        self.degree = degree
        self.output_dim = (degree + 1) ** 2
    
    def forward(self, directions: torch.Tensor) -> torch.Tensor:
        """
        Encode directions using spherical harmonics.
        
        Args:
            directions: Unit direction vectors (N, 3)
            
        Returns:
            Encoded directions (N, output_dim)
        """
        # Ensure directions are normalized
        directions = F.normalize(directions, dim=-1)
        
        x, y, z = directions[..., 0], directions[..., 1], directions[..., 2]
        
        # Compute spherical harmonics up to degree 4
        features = []
        
        # Degree 0
        features.append(torch.ones_like(x) * 0.28209479177387814)  # 1/2 * sqrt(1/pi)
        
        if self.degree >= 1:
            # Degree 1
            features.append(-0.48860251190291987 * y)  # -sqrt(3/(4*pi)) * y
            features.append(0.48860251190291987 * z)   # sqrt(3/(4*pi)) * z
            features.append(-0.48860251190291987 * x)  # -sqrt(3/(4*pi)) * x
        
        if self.degree >= 2:
            # Degree 2
            features.append(1.0925484305920792 * x * y)  # sqrt(15/(4*pi)) * x * y
            features.append(-1.0925484305920792 * y * z)  # -sqrt(15/(4*pi)) * y * z
            features.append(0.31539156525252005 * (3 * z**2 - 1))  # sqrt(5/(16*pi)) * (3*z^2 - 1)
            features.append(-1.0925484305920792 * x * z)  # -sqrt(15/(4*pi)) * x * z
            features.append(0.5462742152960396 * (x**2 - y**2))  # sqrt(15/(16*pi)) * (x^2 - y^2)
        
        if self.degree >= 3:
            # Degree 3 (simplified)
            features.append(-0.5900435899266435 * y * (3 * x**2 - y**2))
            features.append(2.890611442640554 * x * y * z)
            features.append(-0.4570457994644658 * y * (5 * z**2 - 1))
            features.append(0.3731763325901154 * z * (5 * z**2 - 3))
            features.append(-0.4570457994644658 * x * (5 * z**2 - 1))
            features.append(1.445305721320277 * z * (x**2 - y**2))
            features.append(-0.5900435899266435 * x * (x**2 - 3 * y**2))
        
        if self.degree >= 4:
            # Degree 4 (simplified)
            features.append(2.5033429417967046 * x * y * (x**2 - y**2))
            features.append(-1.7701307697799304 * y * z * (3 * x**2 - y**2))
            features.append(0.9461746957575601 * x * y * (7 * z**2 - 1))
            features.append(-0.6690465435572892 * y * z * (7 * z**2 - 3))
            features.append(0.10578554691520431 * (35 * z**4 - 30 * z**2 + 3))
            features.append(-0.6690465435572892 * x * z * (7 * z**2 - 3))
            features.append(0.47308734787878004 * (x**2 - y**2) * (7 * z**2 - 1))
            features.append(-1.7701307697799304 * x * z * (x**2 - 3 * y**2))
            features.append(0.6258357354491761 * (x**4 - 6 * x**2 * y**2 + y**4))
        
        return torch.stack(features[:self.output_dim], dim=-1)


class InstantNGP(NerfModel):
    """Instant Neural Graphics Primitives model."""
    
    def __init__(self, config: ModelConfig, scene: Scene):
        """Initialize Instant-NGP model."""
        # Don't call super().__init__ to avoid creating standard NeRF networks
        nn.Module.__init__(self)
        
        self.config = config
        self.scene = scene
        self.is_initialized = True
        
        # Hash encoding for positions
        self.hash_encoding = HashEncoding(
            num_levels=16,
            base_resolution=config.base_resolution,
            max_resolution=config.max_resolution,
            log2_hashmap_size=config.log2_hashmap_size,
            feature_dim=2
        )
        
        # Spherical harmonics for directions
        self.direction_encoding = SphericalHarmonicsEncoding(degree=4)
        
        # Small MLPs for fast inference
        hash_features = self.hash_encoding.num_levels * self.hash_encoding.feature_dim
        
        # Density network (hash features -> density + geometry features)
        self.sigma_network = nn.Sequential(
            nn.Linear(hash_features, config.network_width),
            nn.ReLU(inplace=True),
            nn.Linear(config.network_width, 16)  # 1 density + 15 geometry features
        )
        
        # Color network (geometry features + encoded directions -> RGB)
        if config.use_viewdirs:
            color_input_dim = 15 + self.direction_encoding.output_dim
        else:
            color_input_dim = 15
            
        self.color_network = nn.Sequential(
            nn.Linear(color_input_dim, config.network_width),
            nn.ReLU(inplace=True),
            nn.Linear(config.network_width, config.network_width),
            nn.ReLU(inplace=True),
            nn.Linear(config.network_width, 3)
        )
        
        # Initialize weights
        self._initialize_weights()
    
    def _initialize_weights(self):
        """Initialize network weights for Instant-NGP."""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                # Use smaller initialization for fast convergence
                nn.init.uniform_(module.weight, -1e-4, 1e-4)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
    
    def forward(
        self,
        ray_origins: torch.Tensor,
        ray_directions: torch.Tensor,
        near: float = 0.2,
        far: float = 6.0,
        num_samples: int = 256,
        use_viewdirs: bool = True
    ) -> torch.Tensor:
        """
        Forward pass through Instant-NGP.
        
        Args:
            ray_origins: Ray origins (N, 3)
            ray_directions: Ray directions (N, 3)
            near: Near clipping plane
            far: Far clipping plane
            num_samples: Number of samples per ray
            use_viewdirs: Whether to use view directions
            
        Returns:
            Rendered colors (N, 4) - RGB + accumulated alpha
        """
        batch_size = ray_origins.shape[0]
        device = ray_origins.device
        
        # Adaptive sampling based on distance
        t_vals = self._adaptive_sampling(ray_origins, ray_directions, near, far, num_samples)
        
        # Compute sample positions
        ray_directions_norm = F.normalize(ray_directions, dim=-1)
        sample_positions = ray_origins.unsqueeze(1) + ray_directions_norm.unsqueeze(1) * t_vals.unsqueeze(-1)
        
        # Flatten for network inference
        flat_positions = sample_positions.reshape(-1, 3)
        
        # Query density and geometry features
        density_geo = self.query_density_geometry(flat_positions)
        densities = density_geo[..., 0]  # (N*S,)
        geo_features = density_geo[..., 1:]  # (N*S, 15)
        
        # Query colors
        if use_viewdirs and self.config.use_viewdirs:
            flat_directions = ray_directions_norm.unsqueeze(1).expand(-1, num_samples, -1).reshape(-1, 3)
            colors = self.query_colors_ngp(geo_features, flat_directions)
        else:
            colors = self.query_colors_ngp(geo_features)
        
        # Reshape back
        densities = densities.reshape(batch_size, num_samples)
        colors = colors.reshape(batch_size, num_samples, 3)
        
        # Volume rendering with early termination
        rendered_colors = self.volume_render_optimized(colors, densities, t_vals)
        
        return rendered_colors
    
    def query_density_geometry(self, positions: torch.Tensor) -> torch.Tensor:
        """
        Query density and geometry features using hash encoding.
        
        Args:
            positions: 3D positions (N, 3)
            
        Returns:
            Density and geometry features (N, 16)
        """
        # Normalize positions to scene bounds
        positions_norm = self.normalize_positions(positions)
        
        # Hash encoding
        hash_features = self.hash_encoding(positions_norm)
        
        # Density and geometry network
        density_geo = self.sigma_network(hash_features)
        
        # Apply softplus to density for stability
        density = F.softplus(density_geo[..., 0:1] - 1.0)  # Bias towards empty space
        geo_features = density_geo[..., 1:]
        
        return torch.cat([density, geo_features], dim=-1)
    
    def query_colors_ngp(
        self,
        geo_features: torch.Tensor,
        directions: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Query RGB colors from geometry features and directions.
        
        Args:
            geo_features: Geometry features (N, 15)
            directions: View directions (N, 3), optional
            
        Returns:
            RGB colors (N, 3)
        """
        if directions is not None and self.config.use_viewdirs:
            # Spherical harmonics encoding
            dir_encoded = self.direction_encoding(directions)
            
            # Concatenate geometry and direction features
            color_input = torch.cat([geo_features, dir_encoded], dim=-1)
        else:
            color_input = geo_features
        
        # Color network
        colors = self.color_network(color_input)
        
        # Apply sigmoid activation
        colors = torch.sigmoid(colors)
        
        return colors
    
    def _adaptive_sampling(
        self,
        ray_origins: torch.Tensor,
        ray_directions: torch.Tensor,
        near: float,
        far: float,
        num_samples: int
    ) -> torch.Tensor:
        """Adaptive sampling with higher density near surfaces."""
        batch_size = ray_origins.shape[0]
        device = ray_origins.device
        
        if self.training:
            # During training, use uniform sampling with noise
            t_vals = torch.linspace(near, far, num_samples, device=device)
            t_vals = t_vals.expand(batch_size, num_samples)
            
            noise = torch.rand_like(t_vals) * (far - near) / num_samples
            t_vals = t_vals + noise
        else:
            # During inference, use more sophisticated sampling
            # For now, use uniform sampling but this could be improved
            t_vals = torch.linspace(near, far, num_samples, device=device)
            t_vals = t_vals.expand(batch_size, num_samples)
        
        return t_vals
    
    def volume_render_optimized(
        self,
        colors: torch.Tensor,
        densities: torch.Tensor,
        t_vals: torch.Tensor
    ) -> torch.Tensor:
        """
        Optimized volume rendering with early termination.
        
        Args:
            colors: RGB colors (N, S, 3)
            densities: Volume densities (N, S)
            t_vals: Sample distances (N, S)
            
        Returns:
            Rendered colors with alpha (N, 4)
        """
        # Compute delta distances
        dists = t_vals[..., 1:] - t_vals[..., :-1]
        dists = torch.cat([dists, torch.full_like(dists[..., :1], 1e10)], dim=-1)
        
        # Compute alpha values
        alpha = 1.0 - torch.exp(-densities * dists)
        
        # Early termination optimization
        # Create mask for samples that contribute significantly
        alpha_threshold = 0.001
        valid_mask = alpha > alpha_threshold
        
        # Compute transmittance with early termination
        transmittance = torch.ones_like(alpha)
        accumulated_alpha = torch.zeros_like(alpha[..., 0])
        
        for i in range(alpha.shape[-1]):
            if i > 0:
                transmittance[..., i] = transmittance[..., i-1] * (1.0 - alpha[..., i-1])
            
            # Early termination when accumulated alpha is high
            early_term_mask = accumulated_alpha > 0.99
            transmittance[early_term_mask, i:] = 0.0
            break
        
        # Compute weights
        weights = alpha * transmittance
        
        # Accumulate colors
        rgb = torch.sum(weights.unsqueeze(-1) * colors, dim=-2)
        
        # Compute accumulated alpha
        acc_alpha = torch.sum(weights, dim=-1, keepdim=True)
        
        # Add white background if specified
        if self.scene.config.use_white_background:
            rgb = rgb + (1.0 - acc_alpha)
        
        return torch.cat([rgb, acc_alpha], dim=-1)
    
    def hierarchical_sample(
        self,
        ray_origins: torch.Tensor,
        ray_directions: torch.Tensor,
        num_coarse: int = 64,
        num_fine: int = 128,
        near: float = 0.2,
        far: float = 6.0
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Hierarchical sampling optimized for Instant-NGP.
        
        Returns:
            coarse_samples: Coarse sample positions (N, num_coarse, 3)  
            fine_samples: Fine sample positions (N, num_fine, 3)
        """
        batch_size = ray_origins.shape[0]
        device = ray_origins.device
        
        # Coarse sampling
        t_coarse = self._adaptive_sampling(ray_origins, ray_directions, near, far, num_coarse)
        ray_directions_norm = F.normalize(ray_directions, dim=-1)
        coarse_samples = ray_origins.unsqueeze(1) + ray_directions_norm.unsqueeze(1) * t_coarse.unsqueeze(-1)
        
        # Fast density evaluation for importance sampling
        flat_coarse = coarse_samples.reshape(-1, 3)
        with torch.no_grad():
            density_geo = self.query_density_geometry(flat_coarse)
            coarse_densities = density_geo[..., 0].reshape(batch_size, num_coarse)
        
        # Importance sampling for fine samples
        weights = self._compute_sample_weights(coarse_densities, t_coarse)
        t_fine = self._sample_pdf(t_coarse, weights, num_fine)
        
        fine_samples = ray_origins.unsqueeze(1) + ray_directions_norm.unsqueeze(1) * t_fine.unsqueeze(-1)
        
        return coarse_samples, fine_samples
    
    def get_hash_table_usage(self) -> Dict[str, float]:
        """Get hash table usage statistics."""
        hash_table = self.hash_encoding.hash_table
        
        # Compute statistics
        mean_magnitude = torch.mean(torch.norm(hash_table, dim=-1)).item()
        std_magnitude = torch.std(torch.norm(hash_table, dim=-1)).item()
        max_magnitude = torch.max(torch.norm(hash_table, dim=-1)).item()
        
        # Estimate usage (features with magnitude above threshold)
        threshold = 1e-5
        used_entries = torch.sum(torch.norm(hash_table, dim=-1) > threshold).item()
        usage_ratio = used_entries / hash_table.shape[0]
        
        return {
            'mean_magnitude': mean_magnitude,
            'std_magnitude': std_magnitude,
            'max_magnitude': max_magnitude,
            'usage_ratio': usage_ratio,
            'total_entries': hash_table.shape[0],
            'used_entries': used_entries
        }
    
    def to_deployment_format(self) -> Dict[str, Any]:
        """Convert Instant-NGP to deployment format."""
        return {
            'model_type': 'instant_ngp',
            'config': {
                'network_width': self.config.network_width,
                'base_resolution': self.config.base_resolution,
                'max_resolution': self.config.max_resolution,
                'log2_hashmap_size': self.config.log2_hashmap_size,
                'use_viewdirs': self.config.use_viewdirs
            },
            'hash_encoding': {
                'num_levels': self.hash_encoding.num_levels,
                'feature_dim': self.hash_encoding.feature_dim,
                'resolutions': self.hash_encoding.resolutions.tolist(),
                'hash_table': self.hash_encoding.hash_table.detach().cpu().numpy()
            },
            'networks': {
                'sigma_network': self.sigma_network.state_dict(),
                'color_network': self.color_network.state_dict()
            },
            'scene_bounds': self.scene.bounds.tolist()
        }