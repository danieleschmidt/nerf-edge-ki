"""
Base NeRF model implementation with standard neural radiance fields.

This module provides the foundational NeRF architecture including:
- Positional encoding for input coordinates
- Multi-layer perceptron for density and color prediction
- Hierarchical volume sampling
- Differentiable volume rendering
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Tuple, Dict, Any
import numpy as np

from ..core.config import ModelConfig
from ..core.scene import Scene


class PositionalEncoding(nn.Module):
    """Positional encoding module for coordinate inputs."""
    
    def __init__(self, input_dim: int = 3, num_levels: int = 10, include_input: bool = True):
        """
        Initialize positional encoding.
        
        Args:
            input_dim: Input coordinate dimension (3 for positions, 3 for directions)
            num_levels: Number of frequency levels
            include_input: Whether to include original coordinates
        """
        super().__init__()
        self.input_dim = input_dim
        self.num_levels = num_levels
        self.include_input = include_input
        
        # Output dimension: input_dim + 2 * input_dim * num_levels (sin + cos)
        self.output_dim = input_dim if include_input else 0
        self.output_dim += 2 * input_dim * num_levels
        
        # Frequency bands
        freq_bands = 2.0 ** torch.linspace(0, num_levels - 1, num_levels)
        self.register_buffer('freq_bands', freq_bands)
    
    def forward(self, coords: torch.Tensor) -> torch.Tensor:
        """
        Apply positional encoding to coordinates.
        
        Args:
            coords: Input coordinates (..., input_dim)
            
        Returns:
            Encoded coordinates (..., output_dim)
        """
        encoded = []
        
        if self.include_input:
            encoded.append(coords)
        
        for freq in self.freq_bands:
            for func in [torch.sin, torch.cos]:
                encoded.append(func(coords * freq))
        
        return torch.cat(encoded, dim=-1)


class MLP(nn.Module):
    """Multi-layer perceptron with skip connections."""
    
    def __init__(
        self,
        input_dim: int,
        output_dim: int,
        hidden_dim: int = 256,
        num_layers: int = 8,
        skip_connections: Optional[list] = None,
        activation: str = 'relu'
    ):
        """
        Initialize MLP.
        
        Args:
            input_dim: Input feature dimension
            output_dim: Output feature dimension
            hidden_dim: Hidden layer dimension
            num_layers: Number of layers
            skip_connections: Layers to add skip connections
            activation: Activation function name
        """
        super().__init__()
        
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.skip_connections = skip_connections or []
        
        # Activation function
        if activation == 'relu':
            self.activation = F.relu
        elif activation == 'leaky_relu':
            self.activation = F.leaky_relu
        else:
            raise ValueError(f"Unsupported activation: {activation}")
        
        # Build layers
        self.layers = nn.ModuleList()
        
        for i in range(num_layers):
            if i == 0:
                layer_input_dim = input_dim
            elif i in self.skip_connections:
                layer_input_dim = hidden_dim + input_dim
            else:
                layer_input_dim = hidden_dim
            
            if i == num_layers - 1:
                layer_output_dim = output_dim
            else:
                layer_output_dim = hidden_dim
            
            self.layers.append(nn.Linear(layer_input_dim, layer_output_dim))
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through MLP."""
        input_x = x
        
        for i, layer in enumerate(self.layers):
            if i in self.skip_connections and i > 0:
                x = torch.cat([x, input_x], dim=-1)
            
            x = layer(x)
            
            if i < len(self.layers) - 1:
                x = self.activation(x)
        
        return x


class NerfModel(nn.Module):
    """Neural Radiance Fields model."""
    
    def __init__(self, config: ModelConfig, scene: Scene):
        """
        Initialize NeRF model.
        
        Args:
            config: Model configuration
            scene: Scene instance for bounds and metadata
        """
        super().__init__()
        
        self.config = config
        self.scene = scene
        self.is_initialized = True
        
        # Positional encoding for positions and directions
        self.pos_encoding = PositionalEncoding(
            input_dim=3,
            num_levels=config.positional_encoding_levels,
            include_input=True
        )
        
        if config.use_viewdirs:
            self.dir_encoding = PositionalEncoding(
                input_dim=3,
                num_levels=config.direction_encoding_levels,
                include_input=True
            )
        
        # Network architecture
        pos_input_dim = self.pos_encoding.output_dim
        
        # Density network (position -> density + features)
        self.density_network = MLP(
            input_dim=pos_input_dim,
            output_dim=config.network_width + 1,  # features + density
            hidden_dim=config.network_width,
            num_layers=config.network_depth,
            skip_connections=config.skips
        )
        
        # Color network (features + encoded directions -> RGB)
        if config.use_viewdirs:
            dir_input_dim = self.dir_encoding.output_dim
            color_input_dim = config.network_width + dir_input_dim
        else:
            color_input_dim = config.network_width
        
        self.color_network = MLP(
            input_dim=color_input_dim,
            output_dim=3,  # RGB
            hidden_dim=config.network_width // 2,
            num_layers=2
        )
        
        # Initialize weights
        self._initialize_weights()
    
    def _initialize_weights(self):
        """Initialize network weights."""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
    
    def forward(
        self, 
        ray_origins: torch.Tensor, 
        ray_directions: torch.Tensor,
        near: float = 0.2,
        far: float = 6.0,
        num_samples: int = 64,
        use_viewdirs: bool = True
    ) -> torch.Tensor:
        """
        Forward pass: render rays through the NeRF.
        
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
        
        # Sample points along rays
        t_vals = torch.linspace(near, far, num_samples, device=device)
        t_vals = t_vals.expand(batch_size, num_samples)
        
        # Add noise for training
        if self.training:
            noise = torch.rand_like(t_vals) * (far - near) / num_samples
            t_vals = t_vals + noise
        
        # Compute sample positions
        ray_directions_norm = F.normalize(ray_directions, dim=-1)
        sample_positions = ray_origins.unsqueeze(1) + ray_directions_norm.unsqueeze(1) * t_vals.unsqueeze(-1)
        
        # Flatten for network inference
        flat_positions = sample_positions.reshape(-1, 3)
        
        # Query density and features
        density_features = self.query_density_features(flat_positions)
        densities = density_features[..., 0]  # (N*S,)
        features = density_features[..., 1:]  # (N*S, W)
        
        # Query colors
        if use_viewdirs and self.config.use_viewdirs:
            # Expand directions to match sample positions
            flat_directions = ray_directions_norm.unsqueeze(1).expand(-1, num_samples, -1).reshape(-1, 3)
            colors = self.query_colors(features, flat_directions)
        else:
            colors = self.query_colors(features)
        
        # Reshape back
        densities = densities.reshape(batch_size, num_samples)
        colors = colors.reshape(batch_size, num_samples, 3)
        
        # Volume rendering
        rendered_colors = self.volume_render(colors, densities, t_vals)
        
        return rendered_colors
    
    def query_density_features(self, positions: torch.Tensor) -> torch.Tensor:
        """
        Query density and features at 3D positions.
        
        Args:
            positions: 3D positions (N, 3)
            
        Returns:
            Density and features (N, 1 + W)
        """
        # Normalize positions to scene bounds
        positions_norm = self.normalize_positions(positions)
        
        # Positional encoding
        pos_encoded = self.pos_encoding(positions_norm)
        
        # Network forward pass
        density_features = self.density_network(pos_encoded)
        
        # Apply activation to density
        density = F.relu(density_features[..., 0:1])
        features = density_features[..., 1:]
        
        return torch.cat([density, features], dim=-1)
    
    def query_colors(
        self, 
        features: torch.Tensor, 
        directions: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Query RGB colors from features and view directions.
        
        Args:
            features: Feature vectors (N, W)
            directions: View directions (N, 3), optional
            
        Returns:
            RGB colors (N, 3)
        """
        if directions is not None and self.config.use_viewdirs:
            # Encode directions
            dir_encoded = self.dir_encoding(directions)
            
            # Concatenate features and directions
            color_input = torch.cat([features, dir_encoded], dim=-1)
        else:
            color_input = features
        
        # Color network forward pass
        colors = self.color_network(color_input)
        
        # Apply sigmoid activation
        colors = torch.sigmoid(colors)
        
        return colors
    
    def volume_render(
        self, 
        colors: torch.Tensor, 
        densities: torch.Tensor, 
        t_vals: torch.Tensor
    ) -> torch.Tensor:
        """
        Perform differentiable volume rendering.
        
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
        
        # Compute transmittance
        transmittance = torch.cumprod(
            torch.cat([torch.ones_like(alpha[..., :1]), 1.0 - alpha + 1e-10], dim=-1),
            dim=-1
        )[..., :-1]
        
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
    
    def normalize_positions(self, positions: torch.Tensor) -> torch.Tensor:
        """Normalize positions to scene bounds."""
        bounds = self.scene.bounds.to(positions.device)
        min_bound, max_bound = bounds[0], bounds[1]
        
        # Normalize to [-1, 1]
        positions_norm = 2.0 * (positions - min_bound) / (max_bound - min_bound) - 1.0
        
        return positions_norm
    
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
        Hierarchical sampling for NeRF.
        
        Args:
            ray_origins: Ray origins (N, 3)
            ray_directions: Ray directions (N, 3)
            num_coarse: Number of coarse samples
            num_fine: Number of fine samples
            near: Near clipping plane
            far: Far clipping plane
            
        Returns:
            coarse_samples: Coarse sample positions (N, num_coarse, 3)
            fine_samples: Fine sample positions (N, num_fine, 3)
        """
        batch_size = ray_origins.shape[0]
        device = ray_origins.device
        
        # Coarse sampling
        t_coarse = torch.linspace(near, far, num_coarse, device=device)
        t_coarse = t_coarse.expand(batch_size, num_coarse)
        
        if self.training:
            noise = torch.rand_like(t_coarse) * (far - near) / num_coarse
            t_coarse = t_coarse + noise
        
        ray_directions_norm = F.normalize(ray_directions, dim=-1)
        coarse_samples = ray_origins.unsqueeze(1) + ray_directions_norm.unsqueeze(1) * t_coarse.unsqueeze(-1)
        
        # Get coarse densities for importance sampling
        flat_coarse = coarse_samples.reshape(-1, 3)
        coarse_density_features = self.query_density_features(flat_coarse)
        coarse_densities = coarse_density_features[..., 0].reshape(batch_size, num_coarse)
        
        # Importance sampling for fine samples
        weights = self._compute_sample_weights(coarse_densities, t_coarse)
        t_fine = self._sample_pdf(t_coarse, weights, num_fine)
        
        fine_samples = ray_origins.unsqueeze(1) + ray_directions_norm.unsqueeze(1) * t_fine.unsqueeze(-1)
        
        return coarse_samples, fine_samples
    
    def _compute_sample_weights(self, densities: torch.Tensor, t_vals: torch.Tensor) -> torch.Tensor:
        """Compute sampling weights from densities."""
        dists = t_vals[..., 1:] - t_vals[..., :-1]
        dists = torch.cat([dists, torch.full_like(dists[..., :1], 1e10)], dim=-1)
        
        alpha = 1.0 - torch.exp(-densities * dists)
        transmittance = torch.cumprod(
            torch.cat([torch.ones_like(alpha[..., :1]), 1.0 - alpha + 1e-10], dim=-1),
            dim=-1
        )[..., :-1]
        
        weights = alpha * transmittance
        return weights
    
    def _sample_pdf(
        self, 
        t_vals: torch.Tensor, 
        weights: torch.Tensor, 
        num_samples: int
    ) -> torch.Tensor:
        """Sample new t values using inverse transform sampling."""
        # Add small epsilon to prevent division by zero
        weights = weights + 1e-5
        
        # Compute PDF and CDF
        pdf = weights / torch.sum(weights, dim=-1, keepdim=True)
        cdf = torch.cumsum(pdf, dim=-1)
        cdf = torch.cat([torch.zeros_like(cdf[..., :1]), cdf], dim=-1)
        
        # Sample uniform random numbers
        u = torch.rand(weights.shape[0], num_samples, device=weights.device)
        
        # Inverse transform sampling
        indices = torch.searchsorted(cdf, u, right=True)
        below = torch.clamp(indices - 1, 0, cdf.shape[-1] - 1)
        above = torch.clamp(indices, 0, cdf.shape[-1] - 1)
        
        # Linear interpolation
        cdf_g0 = torch.gather(cdf, -1, below)
        cdf_g1 = torch.gather(cdf, -1, above)
        t_g0 = torch.gather(t_vals, -1, below)
        t_g1 = torch.gather(t_vals, -1, above)
        
        denom = cdf_g1 - cdf_g0
        denom = torch.where(denom < 1e-5, torch.ones_like(denom), denom)
        t = t_g0 + (u - cdf_g0) / denom * (t_g1 - t_g0)
        
        return t
    
    def get_memory_usage(self) -> int:
        """Get model memory usage in bytes."""
        total_params = sum(p.numel() for p in self.parameters())
        param_size = sum(p.numel() * p.element_size() for p in self.parameters())
        return param_size
    
    def set_quality(self, quality: str):
        """Set rendering quality level."""
        if quality == 'low':
            self.config.max_samples = 32
        elif quality == 'medium':
            self.config.max_samples = 64
        elif quality == 'high':
            self.config.max_samples = 128
        else:
            raise ValueError(f"Unknown quality level: {quality}")
    
    def to_deployment_format(self) -> Dict[str, Any]:
        """Convert model to deployment format."""
        return {
            'model_type': 'nerf',
            'config': {
                'network_width': self.config.network_width,
                'network_depth': self.config.network_depth,
                'positional_encoding_levels': self.config.positional_encoding_levels,
                'direction_encoding_levels': self.config.direction_encoding_levels,
                'use_viewdirs': self.config.use_viewdirs
            },
            'state_dict': self.state_dict(),
            'scene_bounds': self.scene.bounds.tolist()
        }