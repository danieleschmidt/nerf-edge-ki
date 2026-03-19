"""
Training utilities for TinyNeRF.

Usage
-----
    from nerf_edge import TinyNeRF, VolumeRenderer, SyntheticScene, train

    model    = TinyNeRF()
    renderer = VolumeRenderer(white_bg=True)
    scene    = SyntheticScene(image_size=(32, 32))
    results  = train(model, renderer, scene, num_steps=500)
    print(f"Final PSNR: {results['psnr']:.2f} dB")
"""

import math
import time
from typing import Optional

import torch
import torch.optim as optim

from .model import TinyNeRF
from .renderer import VolumeRenderer
from .scene import SyntheticScene


def compute_psnr(pred: torch.Tensor, target: torch.Tensor) -> float:
    """
    Compute PSNR (dB) between predicted and target images.

    Args:
        pred:   Predicted tensor in [0, 1].
        target: Ground-truth tensor in [0, 1].

    Returns:
        PSNR in dB.
    """
    mse = torch.mean((pred - target) ** 2).item()
    if mse < 1e-10:
        return float("inf")
    return 10.0 * math.log10(1.0 / mse)


def train(
    model: TinyNeRF,
    renderer: VolumeRenderer,
    scene: SyntheticScene,
    num_steps: int = 500,
    lr: float = 5e-4,
    log_every: int = 50,
    device: Optional[str] = None,
) -> dict:
    """
    Train TinyNeRF on synthetic views and report final PSNR.

    Args:
        model:      TinyNeRF instance.
        renderer:   VolumeRenderer instance.
        scene:      SyntheticScene that supplies training views.
        num_steps:  Number of gradient steps.
        lr:         Adam learning rate.
        log_every:  Print progress every N steps.
        device:     "cpu" or "cuda"; auto-detected if None.

    Returns:
        dict with keys: "psnr", "loss_history", "elapsed_s"
    """
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    model = model.to(device)
    renderer = renderer.to(device)
    scene.device = device

    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ExponentialLR(optimizer, gamma=0.9995)

    loss_history = []
    t0 = time.time()

    # Pre-generate views and cycle through them
    print(f"[nerf_edge] Training TinyNeRF for {num_steps} steps on {device}")
    print(f"            image_size={scene.H}×{scene.W}  "
          f"samples/ray={scene.num_samples}  lr={lr}")
    print(f"            model params: {sum(p.numel() for p in model.parameters()):,}")

    # Cache a fixed validation view for consistent PSNR tracking
    import math as _math
    val_theta = _math.pi / 4
    val_phi = _math.pi / 8
    val_origins, val_dirs = scene.camera_rays(val_theta, val_phi)
    val_pts, val_dir_pts, val_t = scene.sample_points(val_origins, val_dirs, perturb=False)
    val_gt = scene.render_gt(val_theta, val_phi).reshape(-1, 3).to(device)

    step = 0
    while step < num_steps:
        for _, _, pts, dir_pts, t_vals, gt_rgb in scene.training_views(num_views=10, perturb=True):
            if step >= num_steps:
                break

            pts = pts.to(device)
            dir_pts = dir_pts.to(device)
            t_vals = t_vals.to(device)
            gt_rgb = gt_rgb.to(device)

            model.train()
            optimizer.zero_grad()

            # Query model at all sample points
            N, S, _ = pts.shape
            pts_flat = pts.reshape(N * S, 3)
            dirs_flat = dir_pts.reshape(N * S, 3)

            rgb_pred, sigma_pred = model(pts_flat, dirs_flat)
            rgb_pred = rgb_pred.reshape(N, S, 3)
            sigma_pred = sigma_pred.reshape(N, S)

            out = renderer(rgb_pred, sigma_pred, t_vals)
            pred_color = out["color"]                          # (N, 3)

            loss = torch.mean((pred_color - gt_rgb) ** 2)
            loss.backward()
            optimizer.step()
            scheduler.step()

            loss_val = loss.item()
            loss_history.append(loss_val)
            step += 1

            if step % log_every == 0 or step == num_steps:
                # Evaluate on validation view
                model.eval()
                with torch.no_grad():
                    vp = val_pts.to(device)
                    vd = val_dir_pts.to(device)
                    vt = val_t.to(device)
                    N2, S2, _ = vp.shape
                    vp_f = vp.reshape(N2 * S2, 3)
                    vd_f = vd.reshape(N2 * S2, 3)
                    vrgb, vsig = model(vp_f, vd_f)
                    vrgb = vrgb.reshape(N2, S2, 3)
                    vsig = vsig.reshape(N2, S2)
                    vout = renderer(vrgb, vsig, vt)
                    psnr = compute_psnr(vout["color"], val_gt)
                print(f"  step {step:4d}/{num_steps}  loss={loss_val:.6f}  PSNR={psnr:.2f} dB")

    elapsed = time.time() - t0

    # Final PSNR on validation view
    model.eval()
    with torch.no_grad():
        vp = val_pts.to(device)
        vd = val_dir_pts.to(device)
        vt = val_t.to(device)
        N2, S2, _ = vp.shape
        vp_f = vp.reshape(N2 * S2, 3)
        vd_f = vd.reshape(N2 * S2, 3)
        vrgb, vsig = model(vp_f, vd_f)
        vrgb = vrgb.reshape(N2, S2, 3)
        vsig = vsig.reshape(N2, S2)
        vout = renderer(vrgb, vsig, vt)
        final_psnr = compute_psnr(vout["color"], val_gt)

    print(f"\n[nerf_edge] Done. elapsed={elapsed:.1f}s  final PSNR={final_psnr:.2f} dB")

    return {
        "psnr": final_psnr,
        "loss_history": loss_history,
        "elapsed_s": elapsed,
        "num_steps": num_steps,
    }
