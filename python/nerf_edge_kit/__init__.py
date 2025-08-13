"""
NeRF Edge Kit - Real-time Neural Radiance Fields for spatial computing.

This package provides a complete framework for training, optimizing, and deploying
NeRF models on edge devices including mobile phones, AR/VR headsets, and web browsers.

Key Features:
- Real-time NeRF inference on edge devices
- Multi-platform deployment (iOS, Web, Python)
- Advanced optimization techniques (quantization, pruning, distillation)
- Foveated rendering for AR/VR applications
- Instant-NGP implementation for fast training
- Cross-platform model formats and deployment
"""

__version__ = "1.0.0"
__author__ = "Terragon Labs"
__email__ = "contact@terragon.ai"

from .core.config import ModelConfig, TrainingConfig, SceneConfig
from .core.scene import Scene
from .models.nerf import NerfModel
from .models.instant_ngp import InstantNGP
from .training.trainer import NerfTrainer
from .optimization.quantization import ModelQuantizer
from .deployment.export import ModelExporter

__all__ = [
    # Core components
    "ModelConfig",
    "TrainingConfig", 
    "SceneConfig",
    "Scene",
    
    # Models
    "NerfModel",
    "InstantNGP",
    
    # Training
    "NerfTrainer",
    
    # Optimization
    "ModelQuantizer",
    
    # Deployment
    "ModelExporter",
]

# Version information
def get_version():
    """Get the package version."""
    return __version__

def get_device_info():
    """Get information about available compute devices."""
    import torch
    
    info = {
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "current_device": torch.cuda.current_device() if torch.cuda.is_available() else "cpu",
    }
    
    if torch.cuda.is_available():
        info["gpu_name"] = torch.cuda.get_device_name(0)
        info["gpu_memory"] = torch.cuda.get_device_properties(0).total_memory
    
    return info