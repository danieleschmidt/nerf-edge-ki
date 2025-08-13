"""
Configuration classes for NeRF Edge Kit.

This module defines configuration objects for different aspects of the NeRF system:
- ModelConfig: Neural network architecture parameters
- TrainingConfig: Training hyperparameters and settings
- SceneConfig: Scene representation and data parameters
"""

from dataclasses import dataclass, field
from typing import Optional, List, Tuple, Dict, Any
import torch


@dataclass
class ModelConfig:
    """Configuration for NeRF model architecture."""
    
    # Model type selection
    model_type: str = "instant_ngp"  # Options: "instant_ngp", "nerf", "mipnerf"
    
    # Network architecture
    network_width: int = 64
    network_depth: int = 2
    skips: List[int] = field(default_factory=lambda: [4])
    
    # Positional encoding
    positional_encoding_levels: int = 10
    direction_encoding_levels: int = 4
    
    # Instant-NGP specific parameters
    hashmap_size: int = 2**19  # 512K entries
    max_resolution: int = 2048
    base_resolution: int = 16
    log2_hashmap_size: int = 19
    finest_resolution: int = 512
    
    # Sampling parameters
    max_samples: int = 1024
    scene_scale: float = 1.0
    near_plane: float = 0.2
    far_plane: float = 1000.0
    
    # Output parameters
    output_channels: int = 4  # RGB + density
    use_viewdirs: bool = True
    
    # Optimization parameters
    use_mixed_precision: bool = True
    gradient_clipping: float = 1.0
    
    def __post_init__(self):
        """Validate configuration parameters."""
        if self.network_width <= 0:
            raise ValueError("network_width must be positive")
        if self.network_depth <= 0:
            raise ValueError("network_depth must be positive")
        if self.max_samples <= 0:
            raise ValueError("max_samples must be positive")
        if self.near_plane >= self.far_plane:
            raise ValueError("near_plane must be less than far_plane")


@dataclass
class TrainingConfig:
    """Configuration for NeRF training process."""
    
    # Basic training parameters
    max_epochs: int = 100
    batch_size: int = 4096
    learning_rate: float = 5e-4
    weight_decay: float = 1e-6
    
    # Learning rate scheduling
    lr_scheduler: str = "exponential"  # Options: "exponential", "cosine", "step"
    lr_decay_rate: float = 0.1
    lr_decay_steps: int = 250000
    
    # Loss function parameters
    loss_type: str = "mse"  # Options: "mse", "l1", "huber"
    coarse_loss_weight: float = 0.1
    fine_loss_weight: float = 1.0
    
    # Regularization
    use_l2_regularization: bool = True
    l2_weight: float = 1e-6
    
    # Data loading
    num_workers: int = 4
    shuffle: bool = True
    pin_memory: bool = True
    
    # Validation
    val_frequency: int = 5  # Validate every N epochs
    val_batch_size: int = 1024
    
    # Checkpointing
    save_frequency: int = 10  # Save every N epochs
    checkpoint_dir: str = "./checkpoints"
    
    # Early stopping
    use_early_stopping: bool = True
    patience: int = 20
    min_delta: float = 1e-6
    
    # Device and precision
    device: str = "auto"  # Options: "auto", "cpu", "cuda", "mps"
    mixed_precision: bool = True
    
    # Logging
    log_frequency: int = 100  # Log every N steps
    use_tensorboard: bool = True
    use_wandb: bool = False
    wandb_project: str = "nerf-edge-kit"
    
    def __post_init__(self):
        """Validate and auto-configure parameters."""
        if self.device == "auto":
            if torch.cuda.is_available():
                self.device = "cuda"
            elif torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        
        # Validate numeric parameters
        if self.batch_size <= 0:
            raise ValueError("batch_size must be positive")
        if self.learning_rate <= 0:
            raise ValueError("learning_rate must be positive")
        if self.max_epochs <= 0:
            raise ValueError("max_epochs must be positive")


@dataclass
class SceneConfig:
    """Configuration for scene representation and data."""
    
    # Scene bounds
    bounds: Tuple[float, float, float, float, float, float] = (-1.0, -1.0, -1.0, 1.0, 1.0, 1.0)
    
    # Camera parameters
    camera_count: int = 100
    image_width: int = 800
    image_height: int = 600
    focal_length: Optional[float] = None
    
    # Data augmentation
    use_augmentation: bool = True
    rotation_range: float = 15.0  # degrees
    translation_range: float = 0.1
    brightness_range: float = 0.1
    contrast_range: float = 0.1
    
    # Sampling strategy
    sampling_strategy: str = "uniform"  # Options: "uniform", "importance", "hierarchical"
    importance_sampling_ratio: float = 0.5
    
    # Background handling
    background_color: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    use_white_background: bool = True
    
    # Data preprocessing
    normalize_images: bool = True
    center_crop: bool = False
    resize_factor: float = 1.0
    
    # Memory optimization
    preload_images: bool = True
    image_cache_size: int = 1000
    
    def get_bounds_tensor(self) -> torch.Tensor:
        """Get scene bounds as PyTorch tensor."""
        return torch.tensor([
            [self.bounds[0], self.bounds[1], self.bounds[2]],
            [self.bounds[3], self.bounds[4], self.bounds[5]]
        ], dtype=torch.float32)
    
    def get_image_size(self) -> Tuple[int, int]:
        """Get effective image size after resizing."""
        return (
            int(self.image_width * self.resize_factor),
            int(self.image_height * self.resize_factor)
        )


@dataclass
class OptimizationConfig:
    """Configuration for model optimization and deployment."""
    
    # Quantization
    enable_quantization: bool = True
    quantization_method: str = "int8"  # Options: "int8", "int4", "float16"
    calibration_samples: int = 1000
    
    # Pruning
    enable_pruning: bool = True
    pruning_ratio: float = 0.5
    structured_pruning: bool = True
    
    # Knowledge distillation
    enable_distillation: bool = False
    teacher_model_path: Optional[str] = None
    distillation_temperature: float = 4.0
    distillation_alpha: float = 0.7
    
    # Model compression
    enable_compression: bool = True
    compression_ratio: float = 0.1
    
    # Hardware-specific optimization
    target_platform: str = "mobile"  # Options: "mobile", "web", "desktop", "server"
    target_fps: int = 60
    target_resolution: Tuple[int, int] = (1080, 720)
    
    # Memory constraints
    max_model_size_mb: int = 50
    max_runtime_memory_mb: int = 512
    
    def get_optimization_params(self) -> Dict[str, Any]:
        """Get optimization parameters as dictionary."""
        return {
            "quantization": {
                "enabled": self.enable_quantization,
                "method": self.quantization_method,
                "calibration_samples": self.calibration_samples
            },
            "pruning": {
                "enabled": self.enable_pruning,
                "ratio": self.pruning_ratio,
                "structured": self.structured_pruning
            },
            "distillation": {
                "enabled": self.enable_distillation,
                "temperature": self.distillation_temperature,
                "alpha": self.distillation_alpha
            },
            "compression": {
                "enabled": self.enable_compression,
                "ratio": self.compression_ratio
            }
        }


def create_mobile_config() -> Tuple[ModelConfig, TrainingConfig, SceneConfig, OptimizationConfig]:
    """Create optimized configuration for mobile deployment."""
    model_config = ModelConfig(
        model_type="instant_ngp",
        network_width=32,
        network_depth=2,
        hashmap_size=2**16,  # Smaller for mobile
        max_resolution=512,
        max_samples=256
    )
    
    training_config = TrainingConfig(
        max_epochs=50,
        batch_size=2048,
        learning_rate=1e-3,
        mixed_precision=True
    )
    
    scene_config = SceneConfig(
        image_width=640,
        image_height=480,
        resize_factor=0.5
    )
    
    optimization_config = OptimizationConfig(
        target_platform="mobile",
        max_model_size_mb=25,
        quantization_method="int8",
        pruning_ratio=0.7
    )
    
    return model_config, training_config, scene_config, optimization_config


def create_web_config() -> Tuple[ModelConfig, TrainingConfig, SceneConfig, OptimizationConfig]:
    """Create optimized configuration for web deployment."""
    model_config = ModelConfig(
        model_type="instant_ngp",
        network_width=64,
        network_depth=3,
        hashmap_size=2**17,
        max_resolution=1024,
        max_samples=512
    )
    
    training_config = TrainingConfig(
        max_epochs=75,
        batch_size=4096,
        learning_rate=5e-4,
        mixed_precision=True
    )
    
    scene_config = SceneConfig(
        image_width=1280,
        image_height=720,
        resize_factor=0.75
    )
    
    optimization_config = OptimizationConfig(
        target_platform="web",
        max_model_size_mb=100,
        quantization_method="float16",
        pruning_ratio=0.3
    )
    
    return model_config, training_config, scene_config, optimization_config