"""
Model quantization and optimization for edge deployment.

This module provides comprehensive quantization techniques including:
- Post-training quantization (INT8, INT4, FP16)
- Quantization-aware training (QAT)
- Dynamic quantization
- Pruning and sparsification
- Knowledge distillation
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.quantization import quantize_dynamic, QuantStub, DeQuantStub
from torch.quantization.qconfig import default_qconfig
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
import copy
import warnings

from ..core.config import OptimizationConfig
from ..models.nerf import NerfModel
from ..models.instant_ngp import InstantNGP


class ModelQuantizer:
    """Comprehensive model quantization and optimization toolkit."""
    
    def __init__(self, config: OptimizationConfig):
        """
        Initialize quantizer with optimization configuration.
        
        Args:
            config: Optimization configuration
        """
        self.config = config
        self.calibration_data = None
        
    def quantize_model(
        self,
        model: nn.Module,
        calibration_dataloader: Optional[torch.utils.data.DataLoader] = None,
        method: str = "dynamic"
    ) -> nn.Module:
        """
        Quantize model using specified method.
        
        Args:
            model: Input model to quantize
            calibration_dataloader: Data for calibration (static quantization)
            method: Quantization method ('dynamic', 'static', 'qat')
            
        Returns:
            Quantized model
        """
        if not self.config.enable_quantization:
            return model
        
        print(f"Quantizing model using {method} method to {self.config.quantization_method}")
        
        if method == "dynamic":
            return self._dynamic_quantization(model)
        elif method == "static":
            return self._static_quantization(model, calibration_dataloader)
        elif method == "qat":
            return self._quantization_aware_training(model)
        else:
            raise ValueError(f"Unknown quantization method: {method}")
    
    def _dynamic_quantization(self, model: nn.Module) -> nn.Module:
        """Apply dynamic quantization."""
        model_copy = copy.deepcopy(model)
        model_copy.eval()
        
        # Define quantization configuration
        if self.config.quantization_method == "int8":
            dtype = torch.qint8
        elif self.config.quantization_method == "float16":
            # For FP16, use different approach
            return self._fp16_quantization(model_copy)
        else:
            raise ValueError(f"Unsupported quantization method: {self.config.quantization_method}")
        
        # Apply dynamic quantization to linear layers
        quantized_model = quantize_dynamic(
            model_copy,
            {nn.Linear},
            dtype=dtype
        )
        
        return quantized_model
    
    def _static_quantization(
        self,
        model: nn.Module,
        calibration_dataloader: torch.utils.data.DataLoader
    ) -> nn.Module:
        """Apply static quantization with calibration."""
        if calibration_dataloader is None:
            warnings.warn("No calibration data provided, falling back to dynamic quantization")
            return self._dynamic_quantization(model)
        
        model_copy = copy.deepcopy(model)
        model_copy.eval()
        
        # Prepare model for static quantization
        model_copy.qconfig = default_qconfig
        torch.quantization.prepare(model_copy, inplace=True)
        
        # Calibration
        print("Running calibration...")
        with torch.no_grad():
            for i, batch in enumerate(calibration_dataloader):
                if i >= self.config.calibration_samples:
                    break
                
                # Extract rays from batch
                rays_o = batch['rays_o'].squeeze(0)
                rays_d = batch['rays_d'].squeeze(0)
                
                try:
                    _ = model_copy(rays_o, rays_d)
                except Exception as e:
                    warnings.warn(f"Calibration error at batch {i}: {e}")
                    continue
        
        # Convert to quantized model
        quantized_model = torch.quantization.convert(model_copy, inplace=False)
        
        return quantized_model
    
    def _quantization_aware_training(self, model: nn.Module) -> nn.Module:
        """Prepare model for quantization-aware training."""
        model_copy = copy.deepcopy(model)
        
        # Add quantization stubs
        class QATWrapper(nn.Module):
            def __init__(self, original_model):
                super().__init__()
                self.quant = QuantStub()
                self.model = original_model
                self.dequant = DeQuantStub()
            
            def forward(self, rays_o, rays_d):
                rays_o = self.quant(rays_o)
                rays_d = self.quant(rays_d)
                outputs = self.model(rays_o, rays_d)
                return self.dequant(outputs)
        
        wrapped_model = QATWrapper(model_copy)
        wrapped_model.qconfig = default_qconfig
        
        # Prepare for QAT
        torch.quantization.prepare_qat(wrapped_model, inplace=True)
        
        return wrapped_model
    
    def _fp16_quantization(self, model: nn.Module) -> nn.Module:
        """Convert model to FP16."""
        model_fp16 = model.half()
        return model_fp16
    
    def prune_model(
        self,
        model: nn.Module,
        pruning_ratio: float = 0.5,
        structured: bool = True
    ) -> nn.Module:
        """
        Prune model to reduce parameters.
        
        Args:
            model: Input model
            pruning_ratio: Fraction of parameters to prune
            structured: Whether to use structured pruning
            
        Returns:
            Pruned model
        """
        if not self.config.enable_pruning:
            return model
        
        print(f"Pruning model with ratio {pruning_ratio} ({'structured' if structured else 'unstructured'})")
        
        model_copy = copy.deepcopy(model)
        
        if structured:
            return self._structured_pruning(model_copy, pruning_ratio)
        else:
            return self._unstructured_pruning(model_copy, pruning_ratio)
    
    def _structured_pruning(self, model: nn.Module, pruning_ratio: float) -> nn.Module:
        """Apply structured pruning (remove entire channels/filters)."""
        import torch.nn.utils.prune as prune
        
        # Identify linear layers for pruning
        linear_layers = []
        for name, module in model.named_modules():
            if isinstance(module, nn.Linear):
                linear_layers.append((name, module))
        
        # Apply structured pruning
        for name, module in linear_layers:
            if module.weight.shape[0] > 1:  # Don't prune single-neuron layers
                n_filters_to_prune = int(module.weight.shape[0] * pruning_ratio)
                if n_filters_to_prune > 0:
                    prune.ln_structured(
                        module,
                        name='weight',
                        amount=n_filters_to_prune,
                        n=2,
                        dim=0
                    )
        
        return model
    
    def _unstructured_pruning(self, model: nn.Module, pruning_ratio: float) -> nn.Module:
        """Apply unstructured pruning (remove individual weights)."""
        import torch.nn.utils.prune as prune
        
        # Collect all linear layers
        parameters_to_prune = []
        for name, module in model.named_modules():
            if isinstance(module, nn.Linear):
                parameters_to_prune.append((module, 'weight'))
        
        # Apply global unstructured pruning
        prune.global_unstructured(
            parameters_to_prune,
            pruning_method=prune.L1Unstructured,
            amount=pruning_ratio
        )
        
        return model
    
    def compress_model(self, model: nn.Module) -> Tuple[nn.Module, Dict[str, Any]]:
        """
        Apply comprehensive model compression.
        
        Args:
            model: Input model
            
        Returns:
            Compressed model and compression statistics
        """
        if not self.config.enable_compression:
            return model, {}
        
        print("Applying comprehensive model compression...")
        
        original_size = self._get_model_size(model)
        compressed_model = copy.deepcopy(model)
        
        # Apply quantization
        if self.config.enable_quantization:
            compressed_model = self.quantize_model(compressed_model, method="dynamic")
        
        # Apply pruning
        if self.config.enable_pruning:
            compressed_model = self.prune_model(
                compressed_model,
                self.config.pruning_ratio,
                self.config.structured_pruning
            )
        
        # Calculate compression statistics
        compressed_size = self._get_model_size(compressed_model)
        compression_ratio = compressed_size / original_size
        
        stats = {
            'original_size_mb': original_size / (1024 * 1024),
            'compressed_size_mb': compressed_size / (1024 * 1024),
            'compression_ratio': compression_ratio,
            'size_reduction': 1 - compression_ratio,
            'quantization_enabled': self.config.enable_quantization,
            'pruning_enabled': self.config.enable_pruning,
            'pruning_ratio': self.config.pruning_ratio if self.config.enable_pruning else 0
        }
        
        print(f"Compression complete: {stats['original_size_mb']:.1f}MB -> {stats['compressed_size_mb']:.1f}MB "
              f"({stats['size_reduction']*100:.1f}% reduction)")
        
        return compressed_model, stats
    
    def knowledge_distillation(
        self,
        student_model: nn.Module,
        teacher_model: nn.Module,
        dataloader: torch.utils.data.DataLoader,
        num_epochs: int = 10,
        temperature: float = 4.0,
        alpha: float = 0.7
    ) -> nn.Module:
        """
        Apply knowledge distillation to compress model.
        
        Args:
            student_model: Smaller model to train
            teacher_model: Larger pre-trained model
            dataloader: Training data
            num_epochs: Number of distillation epochs
            temperature: Distillation temperature
            alpha: Balance between distillation and ground truth loss
            
        Returns:
            Trained student model
        """
        if not self.config.enable_distillation:
            return student_model
        
        print(f"Starting knowledge distillation for {num_epochs} epochs...")
        
        device = next(student_model.parameters()).device
        teacher_model.to(device)
        teacher_model.eval()
        
        optimizer = torch.optim.Adam(student_model.parameters(), lr=1e-4)
        mse_loss = nn.MSELoss()
        kl_loss = nn.KLDivLoss(reduction='batchmean')
        
        student_model.train()
        
        for epoch in range(num_epochs):
            epoch_loss = 0.0
            num_batches = 0
            
            for batch in dataloader:
                rays_o = batch['rays_o'].squeeze(0).to(device)
                rays_d = batch['rays_d'].squeeze(0).to(device)
                rgb_gt = batch['rgb'].squeeze(0).to(device)
                
                optimizer.zero_grad()
                
                # Student prediction
                student_outputs = student_model(rays_o, rays_d)
                student_rgb = student_outputs[..., :3]
                
                # Teacher prediction
                with torch.no_grad():
                    teacher_outputs = teacher_model(rays_o, rays_d)
                    teacher_rgb = teacher_outputs[..., :3]
                
                # Compute losses
                # Ground truth loss
                gt_loss = mse_loss(student_rgb, rgb_gt)
                
                # Distillation loss
                student_soft = F.log_softmax(student_rgb / temperature, dim=-1)
                teacher_soft = F.softmax(teacher_rgb / temperature, dim=-1)
                distill_loss = kl_loss(student_soft, teacher_soft) * (temperature ** 2)
                
                # Combined loss
                total_loss = alpha * distill_loss + (1 - alpha) * gt_loss
                
                total_loss.backward()
                optimizer.step()
                
                epoch_loss += total_loss.item()
                num_batches += 1
            
            avg_loss = epoch_loss / num_batches
            print(f"Distillation Epoch {epoch+1}/{num_epochs}: Loss = {avg_loss:.6f}")
        
        return student_model
    
    def benchmark_model(
        self,
        model: nn.Module,
        input_shape: Tuple[int, ...] = (1000, 3),
        num_runs: int = 100,
        warmup_runs: int = 10
    ) -> Dict[str, float]:
        """
        Benchmark model performance.
        
        Args:
            model: Model to benchmark
            input_shape: Input tensor shape
            num_runs: Number of benchmark runs
            warmup_runs: Number of warmup runs
            
        Returns:
            Performance metrics
        """
        print(f"Benchmarking model with {num_runs} runs...")
        
        device = next(model.parameters()).device
        model.eval()
        
        # Create dummy input
        rays_o = torch.randn(input_shape, device=device)
        rays_d = torch.randn(input_shape, device=device)
        
        # Warmup
        with torch.no_grad():
            for _ in range(warmup_runs):
                _ = model(rays_o, rays_d)
        
        # Benchmark
        torch.cuda.synchronize() if device.type == 'cuda' else None
        
        times = []
        with torch.no_grad():
            for _ in range(num_runs):
                start_time = torch.cuda.Event(enable_timing=True) if device.type == 'cuda' else None
                end_time = torch.cuda.Event(enable_timing=True) if device.type == 'cuda' else None
                
                if device.type == 'cuda':
                    start_time.record()
                else:
                    start_time = time.time()
                
                outputs = model(rays_o, rays_d)
                
                if device.type == 'cuda':
                    end_time.record()
                    torch.cuda.synchronize()
                    elapsed = start_time.elapsed_time(end_time)
                else:
                    elapsed = (time.time() - start_time) * 1000
                
                times.append(elapsed)
        
        # Compute statistics
        times = np.array(times)
        
        return {
            'mean_time_ms': float(np.mean(times)),
            'std_time_ms': float(np.std(times)),
            'min_time_ms': float(np.min(times)),
            'max_time_ms': float(np.max(times)),
            'throughput_samples_per_sec': 1000 * input_shape[0] / np.mean(times),
            'model_size_mb': self._get_model_size(model) / (1024 * 1024),
            'device': str(device)
        }
    
    def _get_model_size(self, model: nn.Module) -> int:
        """Get model size in bytes."""
        param_size = 0
        buffer_size = 0
        
        for param in model.parameters():
            param_size += param.nelement() * param.element_size()
        
        for buffer in model.buffers():
            buffer_size += buffer.nelement() * buffer.element_size()
        
        return param_size + buffer_size
    
    def validate_optimized_model(
        self,
        original_model: nn.Module,
        optimized_model: nn.Module,
        test_dataloader: torch.utils.data.DataLoader,
        tolerance: float = 0.1
    ) -> Dict[str, Any]:
        """
        Validate that optimized model maintains accuracy.
        
        Args:
            original_model: Original model
            optimized_model: Optimized model
            test_dataloader: Test data
            tolerance: Acceptable PSNR degradation
            
        Returns:
            Validation results
        """
        print("Validating optimized model accuracy...")
        
        device = next(original_model.parameters()).device
        
        original_model.eval()
        optimized_model.eval()
        optimized_model.to(device)
        
        original_psnrs = []
        optimized_psnrs = []
        
        with torch.no_grad():
            for i, batch in enumerate(test_dataloader):
                if i >= 50:  # Limit validation samples
                    break
                
                rays_o = batch['rays_o'].squeeze(0).to(device)
                rays_d = batch['rays_d'].squeeze(0).to(device)
                rgb_gt = batch['rgb'].squeeze(0).to(device)
                
                # Original model prediction
                try:
                    original_outputs = original_model(rays_o, rays_d)
                    original_rgb = original_outputs[..., :3]
                    original_psnr = self._compute_psnr(original_rgb, rgb_gt)
                    original_psnrs.append(original_psnr)
                except Exception as e:
                    print(f"Error with original model: {e}")
                    continue
                
                # Optimized model prediction
                try:
                    # Handle different input types for quantized models
                    if hasattr(optimized_model, 'quant'):
                        # QAT model
                        optimized_outputs = optimized_model(rays_o, rays_d)
                    else:
                        # Other optimized models
                        optimized_outputs = optimized_model(rays_o, rays_d)
                    
                    optimized_rgb = optimized_outputs[..., :3]
                    optimized_psnr = self._compute_psnr(optimized_rgb, rgb_gt)
                    optimized_psnrs.append(optimized_psnr)
                except Exception as e:
                    print(f"Error with optimized model: {e}")
                    continue
        
        if not original_psnrs or not optimized_psnrs:
            return {
                'validation_passed': False,
                'error': 'No valid predictions from models'
            }
        
        # Compute statistics
        original_mean_psnr = np.mean(original_psnrs)
        optimized_mean_psnr = np.mean(optimized_psnrs)
        psnr_degradation = original_mean_psnr - optimized_mean_psnr
        
        validation_passed = psnr_degradation <= tolerance
        
        results = {
            'validation_passed': validation_passed,
            'original_psnr': original_mean_psnr,
            'optimized_psnr': optimized_mean_psnr,
            'psnr_degradation': psnr_degradation,
            'tolerance': tolerance,
            'num_samples': min(len(original_psnrs), len(optimized_psnrs))
        }
        
        status = "PASSED" if validation_passed else "FAILED"
        print(f"Validation {status}: Original PSNR={original_mean_psnr:.2f}, "
              f"Optimized PSNR={optimized_mean_psnr:.2f}, "
              f"Degradation={psnr_degradation:.2f} (tolerance={tolerance})")
        
        return results
    
    def _compute_psnr(self, pred: torch.Tensor, gt: torch.Tensor) -> float:
        """Compute PSNR between prediction and ground truth."""
        mse = torch.mean((pred - gt) ** 2)
        if mse == 0:
            return float('inf')
        return 20 * torch.log10(1.0 / torch.sqrt(mse)).item()


def create_quantization_config() -> OptimizationConfig:
    """Create default quantization configuration."""
    return OptimizationConfig(
        enable_quantization=True,
        quantization_method="int8",
        calibration_samples=100,
        enable_pruning=True,
        pruning_ratio=0.3,
        structured_pruning=True,
        enable_compression=True,
        compression_ratio=0.5
    )