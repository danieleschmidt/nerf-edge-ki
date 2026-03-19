"""
SyntheticScene: procedural RGB scene for demo and unit testing.

Contains a **coloured sphere** and a **coloured box** that the NeRF
is asked to learn from synthetic camera views.

Camera model
------------
Cameras are placed on a sphere of radius `radius` around the origin,
looking inward.  Ray origins and unit directions are returned so
VolumeRenderer can directly consume them.
"""

import math
import torch
import torch.nn.functional as F


class SyntheticScene:
    """
    Procedural scene with a sphere and a box.

    Args:
        image_size:  Pixel resolution (H, W). Default (32, 32).
        focal:       Camera focal length in pixels. Default 30.0.
        radius:      Camera orbit radius. Default 3.0.
        near / far:  Ray marching bounds. Default 1.0 / 5.0.
        num_samples: Stratified samples per ray. Default 64.
        device:      Torch device. Default "cpu".
    """

    def __init__(
        self,
        image_size: tuple[int, int] = (32, 32),
        focal: float = 30.0,
        radius: float = 3.0,
        near: float = 1.0,
        far: float = 5.0,
        num_samples: int = 64,
        device: str = "cpu",
    ) -> None:
        self.H, self.W = image_size
        self.focal = focal
        self.radius = radius
        self.near = near
        self.far = far
        self.num_samples = num_samples
        self.device = device

    # ------------------------------------------------------------------
    # Ray generation
    # ------------------------------------------------------------------
    def camera_rays(
        self, theta: float, phi: float
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Generate (H*W, 3) ray origins and unit directions for a camera
        at spherical coordinates (theta, phi).

        Args:
            theta:  Azimuth in radians.
            phi:    Elevation in radians.

        Returns:
            origins:    (H*W, 3) all identical (camera position).
            directions: (H*W, 3) unit ray directions in world space.
        """
        # Camera position
        cx = self.radius * math.cos(phi) * math.sin(theta)
        cy = self.radius * math.sin(phi)
        cz = self.radius * math.cos(phi) * math.cos(theta)
        cam_pos = torch.tensor([cx, cy, cz], dtype=torch.float32, device=self.device)

        # Camera axes: z points from scene origin toward camera (out)
        z_axis = F.normalize(cam_pos.unsqueeze(0), dim=-1).squeeze(0)
        up = torch.tensor([0.0, 1.0, 0.0], device=self.device)
        # Handle near-degenerate case
        if abs(z_axis[1]) > 0.99:
            up = torch.tensor([0.0, 0.0, 1.0], device=self.device)
        x_axis = F.normalize(torch.linalg.cross(up, z_axis), dim=0)
        y_axis = torch.linalg.cross(z_axis, x_axis)

        # Pixel grid (row, col) → normalised device coords
        i = torch.arange(self.W, dtype=torch.float32, device=self.device)
        j = torch.arange(self.H, dtype=torch.float32, device=self.device)
        jj, ii = torch.meshgrid(j, i, indexing="ij")          # (H, W)

        # Direction in camera space (pinhole model)
        dx = (ii - self.W / 2.0) / self.focal
        dy = -(jj - self.H / 2.0) / self.focal                 # flip y
        dz = torch.ones_like(dx)                               # camera looks along -z_axis

        # Rotate into world space: forward = -z_axis (toward scene center)
        dirs_world = (
            dx.unsqueeze(-1) * x_axis
            + dy.unsqueeze(-1) * y_axis
            + dz.unsqueeze(-1) * (-z_axis)                    # -z_axis points inward
        )                                                      # (H, W, 3)
        dirs_world = F.normalize(dirs_world, dim=-1)

        N = self.H * self.W
        origins = cam_pos.unsqueeze(0).expand(N, -1)           # (N, 3)
        directions = dirs_world.reshape(N, 3)                  # (N, 3)
        return origins, directions

    # ------------------------------------------------------------------
    # Sample points along rays
    # ------------------------------------------------------------------
    def sample_points(
        self,
        origins: torch.Tensor,
        directions: torch.Tensor,
        perturb: bool = False,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Stratified sampling along rays.

        Returns:
            points:  (N, S, 3) world-space 3-D positions.
            dirs:    (N, S, 3) repeated ray directions.
            t_vals:  (N, S)    sample distances.
        """
        N = origins.shape[0]
        S = self.num_samples

        t_vals = torch.linspace(self.near, self.far, S, device=self.device)
        t_vals = t_vals.unsqueeze(0).expand(N, S)              # (N, S)

        if perturb:
            mid = 0.5 * (t_vals[..., 1:] + t_vals[..., :-1])
            upper = torch.cat([mid, t_vals[..., -1:]], dim=-1)
            lower = torch.cat([t_vals[..., :1], mid], dim=-1)
            noise = torch.rand_like(t_vals)
            t_vals = lower + noise * (upper - lower)

        # (N,1,3) + (N,1,3) * (N,S,1) = (N, S, 3)
        points = origins.unsqueeze(1) + directions.unsqueeze(1) * t_vals.unsqueeze(-1)
        dirs = directions.unsqueeze(1).expand_as(points)       # (N, S, 3)
        return points, dirs, t_vals

    # ------------------------------------------------------------------
    # Ground-truth pixel colours (analytical ray-scene intersection)
    # ------------------------------------------------------------------
    def render_gt(
        self, theta: float, phi: float
    ) -> torch.Tensor:
        """
        Analytically render the scene for a given camera pose.

        Scene objects:
            Sphere: centre (0, 0, 0), radius 0.5, colour (1, 0.3, 0.1)
            Box:    centre (0.7, 0, 0), half-extents (0.3, 0.3, 0.3), colour (0.1, 0.5, 1)

        Returns:
            image: (H, W, 3) float tensor in [0, 1], white background.
        """
        origins, directions = self.camera_rays(theta, phi)     # (N, 3)

        pixel_colors = torch.ones(origins.shape[0], 3, device=self.device)

        # ---- Sphere ----
        sc = torch.tensor([0.0, 0.0, 0.0], device=self.device)
        sr = 0.5
        sphere_color = torch.tensor([1.0, 0.3, 0.1], device=self.device)

        oc = origins - sc
        a = (directions * directions).sum(-1)
        b = 2.0 * (oc * directions).sum(-1)
        c_coef = (oc * oc).sum(-1) - sr * sr
        disc = b * b - 4 * a * c_coef
        hit_sphere = disc >= 0
        t_sphere = torch.where(
            hit_sphere,
            (-b - torch.sqrt(disc.clamp(min=0))) / (2 * a),
            torch.tensor(1e10, device=self.device),
        )
        hit_sphere = hit_sphere & (t_sphere > 0.01)

        # ---- Box ----
        bc = torch.tensor([0.7, 0.0, 0.0], device=self.device)
        bh = torch.tensor([0.3, 0.3, 0.3], device=self.device)
        box_color = torch.tensor([0.1, 0.5, 1.0], device=self.device)

        inv_d = 1.0 / (directions + 1e-8)
        t1 = ((bc - bh) - origins) * inv_d   # (N, 3)
        t2 = ((bc + bh) - origins) * inv_d
        tmin_box = torch.max(torch.minimum(t1, t2), dim=-1).values
        tmax_box = torch.min(torch.maximum(t1, t2), dim=-1).values
        hit_box = (tmax_box >= tmin_box) & (tmax_box > 0.01)
        t_box = torch.where(hit_box, tmin_box.clamp(min=0.01), torch.tensor(1e10, device=self.device))

        # ---- Compose (sphere in front of box) ----
        # Use surface normal shading for slight realism
        def shade(pos, center, base_color):
            normal = F.normalize(pos - center, dim=-1)
            light = F.normalize(torch.tensor([1.0, 1.0, 2.0], device=self.device), dim=0)
            diffuse = (normal * light).sum(-1).clamp(0, 1)
            return base_color * (0.3 + 0.7 * diffuse.unsqueeze(-1))

        # Sphere hit positions
        hit_s_idx = hit_sphere.nonzero(as_tuple=True)[0]
        if hit_s_idx.numel() > 0:
            pos_s = origins[hit_s_idx] + directions[hit_s_idx] * t_sphere[hit_s_idx].unsqueeze(-1)
            pixel_colors[hit_s_idx] = shade(pos_s, sc, sphere_color)

        # Box hit positions (only where sphere doesn't occlude)
        hit_b_mask = hit_box & (~hit_sphere | (t_box < t_sphere))
        hit_b_idx = hit_b_mask.nonzero(as_tuple=True)[0]
        if hit_b_idx.numel() > 0:
            pos_b = origins[hit_b_idx] + directions[hit_b_idx] * t_box[hit_b_idx].unsqueeze(-1)
            pixel_colors[hit_b_idx] = shade(pos_b, bc, box_color)

        return pixel_colors.reshape(self.H, self.W, 3)

    # ------------------------------------------------------------------
    # Convenience: generate a batch of training views
    # ------------------------------------------------------------------
    def training_views(
        self, num_views: int = 50, perturb: bool = True
    ):
        """
        Yield (rays_o, rays_d, t_vals, gt_rgb) for `num_views` random cameras.

        Yields:
            rays_o:  (N, 3)    ray origins
            rays_d:  (N, 3)    unit ray directions
            t_vals:  (N, S)    sample distances
            gt_rgb:  (N, 3)    ground-truth pixel colours
        """
        for _ in range(num_views):
            theta = torch.rand(1).item() * 2 * math.pi
            phi = (torch.rand(1).item() - 0.5) * math.pi * 0.5

            origins, directions = self.camera_rays(theta, phi)
            points, dirs, t_vals = self.sample_points(origins, directions, perturb=perturb)
            gt = self.render_gt(theta, phi).reshape(-1, 3)
            yield origins, directions, points, dirs, t_vals, gt
