"""
Model export and deployment utilities for cross-platform deployment.

This module provides exporters for different deployment targets:
- iOS Core ML models
- WebGPU/ONNX models for browsers
- TensorRT for NVIDIA GPUs
- OpenVINO for Intel hardware
- TensorFlow Lite for mobile
"""

import os
import json
import tempfile
import warnings
from pathlib import Path
from typing import Dict, Any, Optional, Union, List
import numpy as np

import torch
import torch.nn as nn
from torch.jit import script

from ..core.config import ModelConfig, OptimizationConfig
from ..models.nerf import NerfModel
from ..models.instant_ngp import InstantNGP


class ModelExporter:
    """Cross-platform model export utilities."""
    
    def __init__(self, optimization_config: Optional[OptimizationConfig] = None):
        """
        Initialize model exporter.
        
        Args:
            optimization_config: Optimization settings for export
        """
        self.optimization_config = optimization_config or OptimizationConfig()
        
    def export_to_coreml(
        self,
        model: nn.Module,
        example_input: torch.Tensor,
        output_path: str,
        model_name: str = "NeRFModel"
    ) -> str:
        """
        Export model to Core ML format for iOS deployment.
        
        Args:
            model: PyTorch model to export
            example_input: Example input for tracing
            output_path: Output file path
            model_name: Model name for Core ML
            
        Returns:
            Path to exported model
        """
        try:
            import coremltools as ct
        except ImportError:
            raise ImportError("coremltools required for Core ML export. Install with: pip install coremltools")
        
        print(f"Exporting model to Core ML: {output_path}")
        
        model.eval()
        
        # Trace the model
        with torch.no_grad():
            traced_model = torch.jit.trace(model, example_input)
        
        # Convert to Core ML
        coreml_model = ct.convert(
            traced_model,
            inputs=[
                ct.TensorType(
                    name="ray_origins",
                    shape=example_input[0].shape,
                    dtype=np.float32
                ),
                ct.TensorType(
                    name="ray_directions", 
                    shape=example_input[1].shape,
                    dtype=np.float32
                )
            ],
            outputs=[
                ct.TensorType(
                    name="colors",
                    dtype=np.float32
                )
            ],
            compute_units=ct.ComputeUnit.ALL,
            minimum_deployment_target=ct.target.iOS17
        )
        
        # Set model metadata
        coreml_model.short_description = f"Real-time NeRF model for spatial computing"
        coreml_model.author = "NeRF Edge Kit"
        coreml_model.license = "MIT"
        coreml_model.version = "1.0.0"
        
        # Save model
        output_path = Path(output_path).with_suffix('.mlpackage')
        coreml_model.save(str(output_path))
        
        print(f"Core ML model saved to: {output_path}")
        return str(output_path)
    
    def export_to_onnx(
        self,
        model: nn.Module,
        example_input: tuple,
        output_path: str,
        opset_version: int = 17
    ) -> str:
        """
        Export model to ONNX format for web deployment.
        
        Args:
            model: PyTorch model to export
            example_input: Example input tuple (rays_o, rays_d)
            output_path: Output file path
            opset_version: ONNX opset version
            
        Returns:
            Path to exported model
        """
        print(f"Exporting model to ONNX: {output_path}")
        
        model.eval()
        output_path = Path(output_path).with_suffix('.onnx')
        
        # Export to ONNX
        torch.onnx.export(
            model,
            example_input,
            str(output_path),
            export_params=True,
            opset_version=opset_version,
            do_constant_folding=True,
            input_names=['ray_origins', 'ray_directions'],
            output_names=['colors'],
            dynamic_axes={
                'ray_origins': {0: 'batch_size'},
                'ray_directions': {0: 'batch_size'},
                'colors': {0: 'batch_size'}
            }
        )
        
        print(f"ONNX model saved to: {output_path}")
        return str(output_path)
    
    def export_to_tensorrt(
        self,
        onnx_path: str,
        output_path: str,
        precision: str = "fp16",
        max_batch_size: int = 1024
    ) -> str:
        """
        Export ONNX model to TensorRT for NVIDIA GPU deployment.
        
        Args:
            onnx_path: Path to ONNX model
            output_path: Output TensorRT engine path
            precision: Precision mode ("fp32", "fp16", "int8")
            max_batch_size: Maximum batch size
            
        Returns:
            Path to TensorRT engine
        """
        try:
            import tensorrt as trt
        except ImportError:
            raise ImportError("TensorRT required for TensorRT export. Install from NVIDIA.")
        
        print(f"Converting ONNX to TensorRT: {onnx_path} -> {output_path}")
        
        logger = trt.Logger(trt.Logger.WARNING)
        builder = trt.Builder(logger)
        network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
        parser = trt.OnnxParser(network, logger)
        
        # Parse ONNX model
        with open(onnx_path, 'rb') as model_file:
            if not parser.parse(model_file.read()):
                for error in range(parser.num_errors):
                    print(parser.get_error(error))
                raise RuntimeError("Failed to parse ONNX model")
        
        # Create builder config
        config = builder.create_builder_config()
        config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 1 << 30)  # 1GB
        
        # Set precision
        if precision == "fp16":
            if not builder.platform_has_fast_fp16:
                warnings.warn("Platform doesn't support fast FP16, falling back to FP32")
            else:
                config.set_flag(trt.BuilderFlag.FP16)
        elif precision == "int8":
            if not builder.platform_has_fast_int8:
                warnings.warn("Platform doesn't support fast INT8, falling back to FP16")
                config.set_flag(trt.BuilderFlag.FP16)
            else:
                config.set_flag(trt.BuilderFlag.INT8)
                # Note: INT8 calibration would be needed here
        
        # Build engine
        serialized_engine = builder.build_serialized_network(network, config)
        
        # Save engine
        output_path = Path(output_path).with_suffix('.trt')
        with open(output_path, 'wb') as f:
            f.write(serialized_engine)
        
        print(f"TensorRT engine saved to: {output_path}")
        return str(output_path)
    
    def export_to_openvino(
        self,
        onnx_path: str,
        output_dir: str,
        precision: str = "FP16"
    ) -> str:
        """
        Export ONNX model to OpenVINO for Intel hardware deployment.
        
        Args:
            onnx_path: Path to ONNX model
            output_dir: Output directory
            precision: Model precision ("FP32", "FP16", "INT8")
            
        Returns:
            Path to OpenVINO IR model
        """
        try:
            from openvino.tools import mo
        except ImportError:
            raise ImportError("OpenVINO required for OpenVINO export. Install with: pip install openvino")
        
        print(f"Converting ONNX to OpenVINO: {onnx_path} -> {output_dir}")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Convert using Model Optimizer
        model = mo.convert_model(
            input_model=onnx_path,
            model_name="nerf_model",
            output_dir=str(output_dir),
            data_type=precision,
            compress_to_fp16=(precision == "FP16")
        )
        
        # Save the model
        output_path = output_dir / "nerf_model.xml"
        
        print(f"OpenVINO model saved to: {output_path}")
        return str(output_path)
    
    def export_to_tflite(
        self,
        model: nn.Module,
        example_input: tuple,
        output_path: str,
        quantize: bool = True
    ) -> str:
        """
        Export model to TensorFlow Lite for mobile deployment.
        
        Args:
            model: PyTorch model to export
            example_input: Example input tuple
            output_path: Output file path
            quantize: Whether to apply quantization
            
        Returns:
            Path to TFLite model
        """
        try:
            import tensorflow as tf
            import onnx
            from onnx_tf.backend import prepare
        except ImportError:
            raise ImportError("TensorFlow and onnx-tf required for TFLite export")
        
        print(f"Exporting model to TensorFlow Lite: {output_path}")
        
        # First export to ONNX
        with tempfile.NamedTemporaryFile(suffix='.onnx', delete=False) as tmp_onnx:
            onnx_path = self.export_to_onnx(model, example_input, tmp_onnx.name)
        
        try:
            # Load ONNX model
            onnx_model = onnx.load(onnx_path)
            
            # Convert ONNX to TensorFlow
            tf_rep = prepare(onnx_model)
            
            # Convert to TFLite
            converter = tf.lite.TFLiteConverter.from_concrete_functions(tf_rep.signatures)
            
            if quantize:
                converter.optimizations = [tf.lite.Optimize.DEFAULT]
                converter.target_spec.supported_types = [tf.float16]
            
            tflite_model = converter.convert()
            
            # Save TFLite model
            output_path = Path(output_path).with_suffix('.tflite')
            with open(output_path, 'wb') as f:
                f.write(tflite_model)
            
            print(f"TensorFlow Lite model saved to: {output_path}")
            return str(output_path)
        
        finally:
            # Clean up temporary ONNX file
            os.unlink(onnx_path)
    
    def export_to_webgpu(
        self,
        model: nn.Module,
        output_dir: str,
        model_config: ModelConfig
    ) -> str:
        """
        Export model weights and architecture for WebGPU deployment.
        
        Args:
            model: PyTorch model to export
            output_dir: Output directory
            model_config: Model configuration
            
        Returns:
            Path to WebGPU model directory
        """
        print(f"Exporting model for WebGPU deployment: {output_dir}")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        model.eval()
        
        # Extract weights and architecture
        if isinstance(model, InstantNGP):
            export_data = self._export_instant_ngp_for_webgpu(model, model_config)
        elif isinstance(model, NerfModel):
            export_data = self._export_nerf_for_webgpu(model, model_config)
        else:
            raise ValueError(f"Unsupported model type for WebGPU export: {type(model)}")
        
        # Save model data
        model_path = output_dir / "model.json"
        with open(model_path, 'w') as f:
            json.dump(export_data, f, indent=2, default=self._json_serialize)
        
        # Save weights as binary
        weights_path = output_dir / "weights.bin"
        self._save_weights_binary(export_data['weights'], weights_path)
        
        # Save deployment metadata
        metadata = {
            "model_type": export_data['model_type'],
            "version": "1.0.0",
            "target_platform": "webgpu",
            "precision": "float32",
            "optimization_config": self.optimization_config.__dict__,
            "files": {
                "model": "model.json",
                "weights": "weights.bin"
            }
        }
        
        metadata_path = output_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"WebGPU model exported to: {output_dir}")
        return str(output_dir)
    
    def _export_instant_ngp_for_webgpu(
        self,
        model: InstantNGP,
        config: ModelConfig
    ) -> Dict[str, Any]:
        """Export Instant-NGP model for WebGPU."""
        # Extract hash encoding
        hash_table = model.hash_encoding.hash_table.detach().cpu().numpy()
        
        # Extract network weights
        sigma_weights = {}
        for name, param in model.sigma_network.named_parameters():
            sigma_weights[name] = param.detach().cpu().numpy()
        
        color_weights = {}
        for name, param in model.color_network.named_parameters():
            color_weights[name] = param.detach().cpu().numpy()
        
        return {
            "model_type": "instant_ngp",
            "config": {
                "network_width": config.network_width,
                "base_resolution": config.base_resolution,
                "max_resolution": config.max_resolution,
                "log2_hashmap_size": config.log2_hashmap_size,
                "use_viewdirs": config.use_viewdirs
            },
            "hash_encoding": {
                "num_levels": model.hash_encoding.num_levels,
                "feature_dim": model.hash_encoding.feature_dim,
                "resolutions": model.hash_encoding.resolutions.cpu().numpy(),
                "hash_table_shape": hash_table.shape
            },
            "weights": {
                "hash_table": hash_table.flatten(),
                "sigma_network": sigma_weights,
                "color_network": color_weights
            },
            "scene_bounds": model.scene.bounds.cpu().numpy()
        }
    
    def _export_nerf_for_webgpu(
        self,
        model: NerfModel,
        config: ModelConfig
    ) -> Dict[str, Any]:
        """Export standard NeRF model for WebGPU."""
        # Extract network weights
        density_weights = {}
        for name, param in model.density_network.named_parameters():
            density_weights[name] = param.detach().cpu().numpy()
        
        color_weights = {}
        for name, param in model.color_network.named_parameters():
            color_weights[name] = param.detach().cpu().numpy()
        
        return {
            "model_type": "nerf",
            "config": {
                "network_width": config.network_width,
                "network_depth": config.network_depth,
                "positional_encoding_levels": config.positional_encoding_levels,
                "direction_encoding_levels": config.direction_encoding_levels,
                "use_viewdirs": config.use_viewdirs
            },
            "encoding": {
                "position_levels": config.positional_encoding_levels,
                "direction_levels": config.direction_encoding_levels,
                "position_input_dim": 3,
                "direction_input_dim": 3
            },
            "weights": {
                "density_network": density_weights,
                "color_network": color_weights
            },
            "scene_bounds": model.scene.bounds.cpu().numpy()
        }
    
    def _save_weights_binary(self, weights_dict: Dict[str, Any], output_path: Path):
        """Save weights as binary file for efficient loading."""
        flattened_weights = []
        weight_info = []
        offset = 0
        
        def flatten_dict(d, prefix=""):
            nonlocal offset
            for key, value in d.items():
                full_key = f"{prefix}.{key}" if prefix else key
                if isinstance(value, dict):
                    flatten_dict(value, full_key)
                elif isinstance(value, np.ndarray):
                    flat = value.astype(np.float32).flatten()
                    flattened_weights.append(flat)
                    weight_info.append({
                        "name": full_key,
                        "shape": list(value.shape),
                        "dtype": str(value.dtype),
                        "offset": offset,
                        "size": len(flat)
                    })
                    offset += len(flat)
        
        flatten_dict(weights_dict)
        
        # Concatenate all weights
        all_weights = np.concatenate(flattened_weights).astype(np.float32)
        
        # Save binary weights
        with open(output_path, 'wb') as f:
            f.write(all_weights.tobytes())
        
        # Save weight info
        info_path = output_path.with_suffix('.json')
        with open(info_path, 'w') as f:
            json.dump(weight_info, f, indent=2)
    
    def _json_serialize(self, obj):
        """Custom JSON serializer for numpy arrays."""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        else:
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    def create_deployment_package(
        self,
        model: nn.Module,
        model_config: ModelConfig,
        target_platforms: List[str],
        output_dir: str,
        example_input: Optional[tuple] = None
    ) -> Dict[str, str]:
        """
        Create deployment package for multiple platforms.
        
        Args:
            model: PyTorch model to export
            model_config: Model configuration
            target_platforms: List of target platforms
            output_dir: Output directory
            example_input: Example input for tracing
            
        Returns:
            Dictionary mapping platforms to export paths
        """
        print(f"Creating deployment package for platforms: {target_platforms}")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create example input if not provided
        if example_input is None:
            batch_size = 1000
            rays_o = torch.randn(batch_size, 3)
            rays_d = torch.randn(batch_size, 3)
            example_input = (rays_o, rays_d)
        
        exported_paths = {}
        
        for platform in target_platforms:
            platform_dir = output_dir / platform
            platform_dir.mkdir(exist_ok=True)
            
            try:
                if platform == "ios":
                    path = self.export_to_coreml(
                        model, example_input,
                        str(platform_dir / "model.mlpackage")
                    )
                elif platform == "web":
                    path = self.export_to_webgpu(
                        model, str(platform_dir), model_config
                    )
                elif platform == "onnx":
                    path = self.export_to_onnx(
                        model, example_input,
                        str(platform_dir / "model.onnx")
                    )
                elif platform == "tensorrt":
                    # First export to ONNX, then convert to TensorRT
                    onnx_path = self.export_to_onnx(
                        model, example_input,
                        str(platform_dir / "model.onnx")
                    )
                    path = self.export_to_tensorrt(
                        onnx_path, str(platform_dir / "model.trt")
                    )
                elif platform == "openvino":
                    # First export to ONNX, then convert to OpenVINO
                    onnx_path = self.export_to_onnx(
                        model, example_input,
                        str(platform_dir / "model.onnx")
                    )
                    path = self.export_to_openvino(
                        onnx_path, str(platform_dir)
                    )
                elif platform == "tflite":
                    path = self.export_to_tflite(
                        model, example_input,
                        str(platform_dir / "model.tflite")
                    )
                else:
                    warnings.warn(f"Unknown platform: {platform}")
                    continue
                
                exported_paths[platform] = path
                print(f"Successfully exported {platform} model to: {path}")
                
            except Exception as e:
                print(f"Failed to export {platform} model: {e}")
                exported_paths[platform] = f"ERROR: {str(e)}"
        
        # Create summary
        summary = {
            "deployment_package": str(output_dir),
            "platforms": target_platforms,
            "exported_paths": exported_paths,
            "model_config": model_config.__dict__,
            "optimization_config": self.optimization_config.__dict__
        }
        
        summary_path = output_dir / "deployment_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        
        print(f"Deployment package created: {output_dir}")
        return exported_paths