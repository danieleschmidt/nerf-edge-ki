"""
nerf_edge — Lightweight Neural Radiance Fields for edge devices.

Modules:
    model        TinyNeRF MLP + positional encoding
    renderer     Differentiable volume renderer
    scene        Synthetic scene generator
    train        Training loop
"""

from .model import TinyNeRF, positional_encoding
from .renderer import VolumeRenderer
from .scene import SyntheticScene
from .train import train, compute_psnr

__all__ = [
    "TinyNeRF",
    "positional_encoding",
    "VolumeRenderer",
    "SyntheticScene",
    "train",
    "compute_psnr",
]
