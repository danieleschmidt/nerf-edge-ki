"""
NeRF Edge Kit Python Training Example
"""

import torch
from nerf_edge_kit import NerfTrainer, ModelExporter

def train_nerf_model():
    # Initialize trainer
    trainer = NerfTrainer(
        scene_path='./data/scene',
        output_path='./models/trained_model.nerf'
    )
    
    # Configure training parameters
    trainer.configure(
        batch_size=4096,
        learning_rate=5e-4,
        max_iterations=200000
    )
    
    # Train model
    trainer.train()
    
    # Export for edge deployment
    exporter = ModelExporter()
    exporter.optimize_for_edge(
        model_path='./models/trained_model.nerf',
        target_platform='vision-pro',
        target_fps=90
    )

if __name__ == "__main__":
    train_nerf_model()