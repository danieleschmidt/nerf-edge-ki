# nerf-edge-ki

**Lightweight Neural Radiance Fields for edge devices.**

A compact, self-contained NeRF implementation that runs on CPU-only hardware
(Raspberry Pi, Jetson Nano, laptops without GPU) while remaining fully
differentiable and trainable.

---

## What is NeRF?

A **Neural Radiance Field** encodes a 3-D scene inside a small neural network.
Given a position **(x, y, z)** and view direction **(θ, φ)**, the network
predicts:

- **RGB colour** — the colour seen from that direction
- **Volume density σ** — how opaque the point is

A differentiable volume renderer accumulates colour along each ray using
classical alpha compositing:

```
C(r) = Σᵢ Tᵢ (1 − exp(−σᵢ δᵢ)) cᵢ

where  Tᵢ = Πⱼ<ᵢ exp(−σⱼ δⱼ)   (accumulated transmittance)
       δᵢ  = tᵢ₊₁ − tᵢ          (sample interval length)
```

---

## Architecture — TinyNeRF

| Component | Details |
|-----------|---------|
| **MLP** | 4 hidden layers × 64 units, ReLU |
| **Position encoding** | 6 frequency levels → 39-D input |
| **Direction encoding** | 4 frequency levels → 27-D |
| **Outputs** | RGB (sigmoid) + σ (softplus) |
| **Parameters** | ~18 K — fits in 72 KB of RAM |
| **Inference** | CPU: ~15 ms per 32×32 frame |

---

## Project Structure

```
nerf_edge/
  __init__.py     — public API
  model.py        — TinyNeRF + positional_encoding
  renderer.py     — VolumeRenderer (differentiable)
  scene.py        — SyntheticScene (sphere + box, analytical GT)
  train.py        — training loop + PSNR utility

tests/
  test_nerf.py    — 26 unit tests (math, shapes, rendering)

demo.py           — train 500 steps, print final PSNR
```

---

## Quick Start

```bash
# Install deps (PyTorch is the only hard requirement)
pip install torch

# Train and evaluate
python demo.py              # 500 steps, 32×32 image
python demo.py --steps 200  # faster smoke test

# Run tests
python -m pytest tests/ -v
```

Expected output after 500 steps on CPU:

```
[nerf_edge] Training TinyNeRF for 500 steps on cpu
            image_size=32×32  samples/ray=64  lr=0.0005
            model params: 18,148
  step  500/500  loss=0.042  PSNR=13.7 dB
✓ Final PSNR: 13.7 dB after 500 steps
```

---

## Edge Device Notes

| Platform | RAM | Inference (32×32) |
|----------|-----|-------------------|
| Raspberry Pi 4 | 4 GB | ~200 ms (CPU) |
| Jetson Nano | 4 GB | ~80 ms (CUDA) |
| MacBook (M-series) | any | ~10 ms (MPS) |
| Desktop GPU | 8 GB+ | <5 ms (CUDA) |

To reduce latency further:

- Decrease `num_samples` (e.g., 32 instead of 64)
- Use `image_size=(16, 16)` for real-time preview
- Export to TorchScript: `torch.jit.script(model)`
- Quantise to INT8 with `torch.quantization`

---

## API

```python
from nerf_edge import TinyNeRF, VolumeRenderer, SyntheticScene, train

model    = TinyNeRF(pos_levels=6, dir_levels=4, hidden_dim=64, num_layers=4)
renderer = VolumeRenderer(white_bg=True)
scene    = SyntheticScene(image_size=(32, 32), num_samples=64)

# Train
results = train(model, renderer, scene, num_steps=500)
print(f"Final PSNR: {results['psnr']:.2f} dB")

# Render a single view
origins, dirs = scene.camera_rays(theta=0.5, phi=0.3)
pts, dir_pts, t_vals = scene.sample_points(origins, dirs)
N, S, _ = pts.shape
rgb, sigma = model(pts.reshape(N*S, 3), dir_pts.reshape(N*S, 3))
out = renderer(rgb.reshape(N, S, 3), sigma.reshape(N, S), t_vals)
image = out["color"].reshape(scene.H, scene.W, 3)
```

---

## References

- Mildenhall et al., *NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis*, ECCV 2020.
- Müller et al., *Instant Neural Graphics Primitives*, SIGGRAPH 2022.

---

## License

MIT © Daniel Schmidt
