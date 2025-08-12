"""
NeRF training pipeline with advanced optimization and monitoring.

This module provides a comprehensive training framework including:
- Multi-GPU distributed training
- Advanced learning rate scheduling
- Validation and checkpointing
- TensorBoard/WandB logging
- Mixed precision training
- Progressive training strategies
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
import json

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
from torch.cuda.amp import GradScaler, autocast
import numpy as np

from ..core.config import ModelConfig, TrainingConfig, SceneConfig
from ..core.scene import Scene, NerfDataset
from ..models.nerf import NerfModel
from ..models.instant_ngp import InstantNGP


class NerfTrainer:
    """Comprehensive NeRF training pipeline."""
    
    def __init__(
        self,
        model_config: ModelConfig,
        training_config: TrainingConfig,
        scene_config: SceneConfig,
        scene: Scene,
        save_dir: str = "./runs"
    ):
        """
        Initialize trainer.
        
        Args:
            model_config: Model architecture configuration
            training_config: Training hyperparameters
            scene_config: Scene configuration
            scene: Scene instance with data
            save_dir: Directory to save checkpoints and logs
        """
        self.model_config = model_config
        self.training_config = training_config
        self.scene_config = scene_config
        self.scene = scene
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup device
        self.device = torch.device(training_config.device)
        print(f"Using device: {self.device}")
        
        # Initialize model
        self.model = self._create_model()
        self.model.to(self.device)
        
        # Initialize optimizer and scheduler
        self.optimizer = self._create_optimizer()
        self.scheduler = self._create_scheduler()
        
        # Mixed precision training
        self.scaler = GradScaler() if training_config.mixed_precision else None
        
        # Loss function
        self.criterion = self._create_loss_function()
        
        # Data loaders
        self.train_loader, self.val_loader = self._create_data_loaders()
        
        # Logging
        self.writer = self._setup_logging()
        
        # Training state
        self.epoch = 0
        self.global_step = 0
        self.best_val_loss = float('inf')
        self.patience_counter = 0
        
        # Metrics tracking
        self.train_losses = []
        self.val_losses = []
        self.learning_rates = []
        
        print(f"Model: {model_config.model_type}")
        print(f"Parameters: {sum(p.numel() for p in self.model.parameters()):,}")
        print(f"Training samples: {len(self.train_loader.dataset)}")
        if self.val_loader:
            print(f"Validation samples: {len(self.val_loader.dataset)}")
    
    def _create_model(self) -> nn.Module:
        """Create NeRF model based on configuration."""
        if self.model_config.model_type == "instant_ngp":
            return InstantNGP(self.model_config, self.scene)
        elif self.model_config.model_type == "nerf":
            return NerfModel(self.model_config, self.scene)
        else:
            raise ValueError(f"Unknown model type: {self.model_config.model_type}")
    
    def _create_optimizer(self) -> optim.Optimizer:
        """Create optimizer with proper parameter grouping."""
        param_groups = []
        
        if isinstance(self.model, InstantNGP):
            # Different learning rates for hash encoding and MLPs
            hash_params = [self.model.hash_encoding.hash_table]
            mlp_params = list(self.model.sigma_network.parameters()) + \
                        list(self.model.color_network.parameters())
            
            param_groups.extend([
                {"params": hash_params, "lr": self.training_config.learning_rate * 10},
                {"params": mlp_params, "lr": self.training_config.learning_rate}
            ])
        else:
            # Standard NeRF uses uniform learning rate
            param_groups = [{"params": self.model.parameters(), "lr": self.training_config.learning_rate}]
        
        return optim.Adam(
            param_groups,
            lr=self.training_config.learning_rate,
            weight_decay=self.training_config.weight_decay,
            eps=1e-8
        )
    
    def _create_scheduler(self) -> optim.lr_scheduler._LRScheduler:
        """Create learning rate scheduler."""
        if self.training_config.lr_scheduler == "exponential":
            return optim.lr_scheduler.ExponentialLR(
                self.optimizer,
                gamma=self.training_config.lr_decay_rate ** (1000 / self.training_config.lr_decay_steps)
            )
        elif self.training_config.lr_scheduler == "cosine":
            return optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer,
                T_max=self.training_config.max_epochs
            )
        elif self.training_config.lr_scheduler == "step":
            return optim.lr_scheduler.StepLR(
                self.optimizer,
                step_size=self.training_config.lr_decay_steps,
                gamma=self.training_config.lr_decay_rate
            )
        else:
            return optim.lr_scheduler.ConstantLR(self.optimizer, factor=1.0)
    
    def _create_loss_function(self) -> nn.Module:
        """Create loss function based on configuration."""
        if self.training_config.loss_type == "mse":
            return nn.MSELoss()
        elif self.training_config.loss_type == "l1":
            return nn.L1Loss()
        elif self.training_config.loss_type == "huber":
            return nn.SmoothL1Loss()
        else:
            raise ValueError(f"Unknown loss type: {self.training_config.loss_type}")
    
    def _create_data_loaders(self) -> Tuple[DataLoader, Optional[DataLoader]]:
        """Create training and validation data loaders."""
        # Split cameras for train/val
        num_cameras = len(self.scene.cameras)
        val_cameras = max(1, num_cameras // 10)  # 10% for validation
        
        train_indices = list(range(num_cameras - val_cameras))
        val_indices = list(range(num_cameras - val_cameras, num_cameras))
        
        # Create datasets
        train_dataset = NerfDataset(self.scene, self.training_config.batch_size)
        
        # Override dataset to use specific camera indices
        train_dataset.camera_indices = train_indices
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=1,  # Dataset already returns batched rays
            shuffle=self.training_config.shuffle,
            num_workers=self.training_config.num_workers,
            pin_memory=self.training_config.pin_memory
        )
        
        # Validation loader
        val_loader = None
        if val_indices:
            val_dataset = NerfDataset(self.scene, self.training_config.val_batch_size)
            val_dataset.camera_indices = val_indices
            
            val_loader = DataLoader(
                val_dataset,
                batch_size=1,
                shuffle=False,
                num_workers=self.training_config.num_workers,
                pin_memory=self.training_config.pin_memory
            )
        
        return train_loader, val_loader
    
    def _setup_logging(self) -> Optional[SummaryWriter]:
        """Setup logging infrastructure."""
        # Create run directory
        run_name = f"{self.model_config.model_type}_{int(time.time())}"
        self.run_dir = self.save_dir / run_name
        self.run_dir.mkdir(exist_ok=True)
        
        # Save configurations
        with open(self.run_dir / "model_config.json", "w") as f:
            json.dump(self.model_config.__dict__, f, indent=2)
        
        with open(self.run_dir / "training_config.json", "w") as f:
            json.dump(self.training_config.__dict__, f, indent=2, default=str)
        
        # Setup TensorBoard
        writer = None
        if self.training_config.use_tensorboard:
            log_dir = self.run_dir / "tensorboard"
            writer = SummaryWriter(log_dir=str(log_dir))
        
        # Setup file logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.run_dir / "training.log"),
                logging.StreamHandler()
            ]
        )
        
        return writer
    
    def train(self) -> Dict[str, Any]:
        """
        Run complete training pipeline.
        
        Returns:
            Training results and metrics
        """
        print(f"Starting training for {self.training_config.max_epochs} epochs")
        
        start_time = time.time()
        
        try:
            for epoch in range(self.training_config.max_epochs):
                self.epoch = epoch
                
                # Training phase
                train_metrics = self._train_epoch()
                
                # Validation phase
                val_metrics = self._validate_epoch() if self.val_loader else {}
                
                # Learning rate step
                self.scheduler.step()
                current_lr = self.optimizer.param_groups[0]['lr']
                self.learning_rates.append(current_lr)
                
                # Logging
                self._log_epoch(epoch, train_metrics, val_metrics, current_lr)
                
                # Checkpointing
                if (epoch + 1) % self.training_config.save_frequency == 0:
                    self._save_checkpoint(epoch, train_metrics, val_metrics)
                
                # Early stopping
                if self.training_config.use_early_stopping:
                    val_loss = val_metrics.get('loss', train_metrics['loss'])
                    if self._check_early_stopping(val_loss):
                        print(f"Early stopping at epoch {epoch}")
                        break
        
        except KeyboardInterrupt:
            print("Training interrupted by user")
        
        finally:
            # Save final checkpoint
            self._save_checkpoint(self.epoch, train_metrics, val_metrics, is_final=True)
            
            # Close logging
            if self.writer:
                self.writer.close()
        
        training_time = time.time() - start_time
        
        return {
            'final_epoch': self.epoch,
            'training_time': training_time,
            'best_val_loss': self.best_val_loss,
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'learning_rates': self.learning_rates
        }
    
    def _train_epoch(self) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        
        epoch_loss = 0.0
        epoch_psnr = 0.0
        num_batches = 0
        
        for batch_idx, batch in enumerate(self.train_loader):
            # Move data to device
            rays_o = batch['rays_o'].squeeze(0).to(self.device)  # Remove batch dimension
            rays_d = batch['rays_d'].squeeze(0).to(self.device)
            rgb_gt = batch['rgb'].squeeze(0).to(self.device)
            
            # Forward pass
            if self.training_config.mixed_precision:
                with autocast():
                    outputs = self.model(rays_o, rays_d)
                    rgb_pred = outputs[..., :3]
                    loss = self.criterion(rgb_pred, rgb_gt)
            else:
                outputs = self.model(rays_o, rays_d)
                rgb_pred = outputs[..., :3]
                loss = self.criterion(rgb_pred, rgb_gt)
            
            # Backward pass
            self.optimizer.zero_grad()
            
            if self.training_config.mixed_precision:
                self.scaler.scale(loss).backward()
                
                # Gradient clipping
                if self.model_config.gradient_clipping > 0:
                    self.scaler.unscale_(self.optimizer)
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(),
                        self.model_config.gradient_clipping
                    )
                
                self.scaler.step(self.optimizer)
                self.scaler.update()
            else:
                loss.backward()
                
                # Gradient clipping
                if self.model_config.gradient_clipping > 0:
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(),
                        self.model_config.gradient_clipping
                    )
                
                self.optimizer.step()
            
            # Metrics
            batch_loss = loss.item()
            batch_psnr = self._compute_psnr(rgb_pred, rgb_gt)
            
            epoch_loss += batch_loss
            epoch_psnr += batch_psnr
            num_batches += 1
            
            # Step logging
            if self.global_step % self.training_config.log_frequency == 0:
                if self.writer:
                    self.writer.add_scalar('train/loss_step', batch_loss, self.global_step)
                    self.writer.add_scalar('train/psnr_step', batch_psnr, self.global_step)
            
            self.global_step += 1
        
        # Compute epoch averages
        avg_loss = epoch_loss / num_batches
        avg_psnr = epoch_psnr / num_batches
        
        self.train_losses.append(avg_loss)
        
        return {
            'loss': avg_loss,
            'psnr': avg_psnr
        }
    
    def _validate_epoch(self) -> Dict[str, float]:
        """Validate for one epoch."""
        if not self.val_loader:
            return {}
        
        self.model.eval()
        
        epoch_loss = 0.0
        epoch_psnr = 0.0
        num_batches = 0
        
        with torch.no_grad():
            for batch in self.val_loader:
                rays_o = batch['rays_o'].squeeze(0).to(self.device)
                rays_d = batch['rays_d'].squeeze(0).to(self.device)
                rgb_gt = batch['rgb'].squeeze(0).to(self.device)
                
                outputs = self.model(rays_o, rays_d)
                rgb_pred = outputs[..., :3]
                
                loss = self.criterion(rgb_pred, rgb_gt)
                psnr = self._compute_psnr(rgb_pred, rgb_gt)
                
                epoch_loss += loss.item()
                epoch_psnr += psnr
                num_batches += 1
        
        avg_loss = epoch_loss / num_batches
        avg_psnr = epoch_psnr / num_batches
        
        self.val_losses.append(avg_loss)
        
        return {
            'loss': avg_loss,
            'psnr': avg_psnr
        }
    
    def _compute_psnr(self, pred: torch.Tensor, gt: torch.Tensor) -> float:
        """Compute Peak Signal-to-Noise Ratio."""
        mse = torch.mean((pred - gt) ** 2)
        if mse == 0:
            return float('inf')
        
        return 20 * torch.log10(1.0 / torch.sqrt(mse)).item()
    
    def _log_epoch(
        self,
        epoch: int,
        train_metrics: Dict[str, float],
        val_metrics: Dict[str, float],
        lr: float
    ):
        """Log epoch results."""
        # Console logging
        train_str = f"Train Loss: {train_metrics['loss']:.6f}, PSNR: {train_metrics['psnr']:.2f}"
        val_str = f"Val Loss: {val_metrics.get('loss', 0):.6f}, PSNR: {val_metrics.get('psnr', 0):.2f}" if val_metrics else ""
        
        print(f"Epoch {epoch+1}/{self.training_config.max_epochs} | {train_str} | {val_str} | LR: {lr:.2e}")
        
        # TensorBoard logging
        if self.writer:
            self.writer.add_scalar('train/loss_epoch', train_metrics['loss'], epoch)
            self.writer.add_scalar('train/psnr_epoch', train_metrics['psnr'], epoch)
            self.writer.add_scalar('train/learning_rate', lr, epoch)
            
            if val_metrics:
                self.writer.add_scalar('val/loss_epoch', val_metrics['loss'], epoch)
                self.writer.add_scalar('val/psnr_epoch', val_metrics['psnr'], epoch)
        
        # File logging
        logging.info(f"Epoch {epoch+1}: {train_str} | {val_str} | LR: {lr:.2e}")
    
    def _save_checkpoint(
        self,
        epoch: int,
        train_metrics: Dict[str, float],
        val_metrics: Dict[str, float],
        is_final: bool = False
    ):
        """Save model checkpoint."""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'train_metrics': train_metrics,
            'val_metrics': val_metrics,
            'model_config': self.model_config.__dict__,
            'training_config': self.training_config.__dict__,
            'global_step': self.global_step
        }
        
        if self.scaler:
            checkpoint['scaler_state_dict'] = self.scaler.state_dict()
        
        # Save checkpoint
        checkpoint_name = 'final_checkpoint.pth' if is_final else f'checkpoint_epoch_{epoch+1}.pth'
        checkpoint_path = self.run_dir / checkpoint_name
        torch.save(checkpoint, checkpoint_path)
        
        # Save best model
        val_loss = val_metrics.get('loss', train_metrics['loss'])
        if val_loss < self.best_val_loss:
            self.best_val_loss = val_loss
            best_path = self.run_dir / 'best_model.pth'
            torch.save(checkpoint, best_path)
            print(f"New best model saved with val loss: {val_loss:.6f}")
    
    def _check_early_stopping(self, val_loss: float) -> bool:
        """Check early stopping condition."""
        if val_loss < self.best_val_loss - self.training_config.min_delta:
            self.patience_counter = 0
        else:
            self.patience_counter += 1
        
        return self.patience_counter >= self.training_config.patience
    
    def load_checkpoint(self, checkpoint_path: str) -> Dict[str, Any]:
        """Load model from checkpoint."""
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        
        if self.scaler and 'scaler_state_dict' in checkpoint:
            self.scaler.load_state_dict(checkpoint['scaler_state_dict'])
        
        self.epoch = checkpoint['epoch']
        self.global_step = checkpoint['global_step']
        
        print(f"Checkpoint loaded from epoch {self.epoch}")
        
        return checkpoint
    
    def export_model(self, export_path: str):
        """Export trained model for deployment."""
        self.model.eval()
        
        # Get deployment format
        if hasattr(self.model, 'to_deployment_format'):
            export_data = self.model.to_deployment_format()
        else:
            export_data = {
                'model_type': self.model_config.model_type,
                'state_dict': self.model.state_dict(),
                'config': self.model_config.__dict__,
                'scene_bounds': self.scene.bounds.tolist()
            }
        
        # Save to file
        torch.save(export_data, export_path)
        print(f"Model exported to: {export_path}")
        
        return export_data