#!/usr/bin/env python3
"""
demo.py — Train TinyNeRF on a synthetic scene and report PSNR.

Usage:
    python demo.py              # 500 steps (default)
    python demo.py --steps 200  # faster run
"""

import argparse
from nerf_edge import TinyNeRF, VolumeRenderer, SyntheticScene, train

parser = argparse.ArgumentParser(description="TinyNeRF demo")
parser.add_argument("--steps",   type=int,   default=500,  help="training steps")
parser.add_argument("--size",    type=int,   default=32,   help="image side (pixels)")
parser.add_argument("--samples", type=int,   default=64,   help="ray samples")
parser.add_argument("--lr",      type=float, default=5e-4, help="learning rate")
args = parser.parse_args()

model    = TinyNeRF(pos_levels=6, dir_levels=4, hidden_dim=64, num_layers=4)
renderer = VolumeRenderer(white_bg=True)
scene    = SyntheticScene(
    image_size=(args.size, args.size),
    num_samples=args.samples,
)

results = train(model, renderer, scene, num_steps=args.steps, lr=args.lr)
print(f"\n✓ Final PSNR: {results['psnr']:.2f} dB after {results['num_steps']} steps "
      f"({results['elapsed_s']:.1f}s)")
