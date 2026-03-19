"""
Tests for nerf_edge — verify math, shapes, and rendering correctness.

Run with:
    ~/anaconda3/bin/python3 -m pytest tests/ -v
"""

import math
import torch
import pytest

from nerf_edge.model import TinyNeRF, positional_encoding, _pos_enc_dim
from nerf_edge.renderer import VolumeRenderer
from nerf_edge.scene import SyntheticScene


# ─────────────────────────────────────────────
# Positional encoding
# ─────────────────────────────────────────────

class TestPositionalEncoding:
    def test_output_dim_1d(self):
        x = torch.zeros(10, 1)
        out = positional_encoding(x, num_levels=6)
        expected = 1 + 2 * 1 * 6  # 13
        assert out.shape == (10, expected)

    def test_output_dim_3d(self):
        x = torch.zeros(5, 3)
        out = positional_encoding(x, num_levels=6)
        expected = _pos_enc_dim(3, 6)  # 39
        assert out.shape == (5, expected)

    def test_identity_at_zero(self):
        """sin(0)=0, cos(0)=1 — the original coords are preserved first."""
        x = torch.zeros(1, 3)
        out = positional_encoding(x, num_levels=1)
        # first 3 are the original coords (zeros)
        assert torch.allclose(out[0, :3], torch.zeros(3))
        # next 3 are sin(pi*0) = 0
        assert torch.allclose(out[0, 3:6], torch.zeros(3), atol=1e-6)
        # next 3 are cos(pi*0) = 1
        assert torch.allclose(out[0, 6:9], torch.ones(3), atol=1e-6)

    def test_deterministic(self):
        x = torch.randn(8, 3)
        assert torch.allclose(positional_encoding(x, 6), positional_encoding(x, 6))

    def test_frequency_doubling(self):
        """Level k should produce sin(2^k π x); check k=1."""
        x = torch.tensor([[0.5]])  # sin(2^1 * pi * 0.5) = sin(pi) ≈ 0
        out = positional_encoding(x, num_levels=2)
        # Level 0: sin(pi*0.5)=1, cos(pi*0.5)≈0
        assert abs(out[0, 1].item() - 1.0) < 1e-5   # sin(pi*0.5)
        # Level 1: sin(2pi*0.5)=0, cos(2pi*0.5)=-1
        assert abs(out[0, 3].item()) < 1e-5           # sin(2pi*0.5)=sin(pi)≈0
        assert abs(out[0, 4].item() + 1.0) < 1e-5    # cos(2pi*0.5)=-1


# ─────────────────────────────────────────────
# TinyNeRF model
# ─────────────────────────────────────────────

class TestTinyNeRF:
    @pytest.fixture
    def model(self):
        return TinyNeRF(pos_levels=6, dir_levels=4, hidden_dim=64, num_layers=4)

    def test_output_shapes(self, model):
        N = 50
        pos = torch.randn(N, 3)
        dirs = torch.randn(N, 3)
        rgb, sigma = model(pos, dirs)
        assert rgb.shape == (N, 3)
        assert sigma.shape == (N,)

    def test_rgb_in_0_1(self, model):
        pos = torch.randn(100, 3)
        dirs = torch.randn(100, 3)
        rgb, _ = model(pos, dirs)
        assert rgb.min() >= 0.0 - 1e-6
        assert rgb.max() <= 1.0 + 1e-6

    def test_sigma_nonneg(self, model):
        pos = torch.randn(100, 3)
        dirs = torch.randn(100, 3)
        _, sigma = model(pos, dirs)
        assert sigma.min() >= 0.0 - 1e-6

    def test_param_count_small(self, model):
        n = sum(p.numel() for p in model.parameters())
        assert n < 200_000, f"Model too large for edge: {n:,} params"

    def test_batched_consistency(self, model):
        """Same inputs → same outputs (no dropout etc.)."""
        model.eval()
        pos = torch.randn(10, 3)
        dirs = torch.randn(10, 3)
        with torch.no_grad():
            r1, s1 = model(pos, dirs)
            r2, s2 = model(pos, dirs)
        assert torch.allclose(r1, r2)
        assert torch.allclose(s1, s2)

    def test_gradient_flows(self, model):
        pos = torch.randn(8, 3)
        dirs = torch.randn(8, 3)
        rgb, sigma = model(pos, dirs)
        loss = rgb.mean() + sigma.mean()
        loss.backward()
        for p in model.parameters():
            assert p.grad is not None


# ─────────────────────────────────────────────
# VolumeRenderer
# ─────────────────────────────────────────────

class TestVolumeRenderer:
    @pytest.fixture
    def renderer(self):
        return VolumeRenderer(white_bg=True)

    def _dummy_inputs(self, N=16, S=32):
        rgb = torch.rand(N, S, 3)
        sigma = torch.rand(N, S) * 5.0
        t_vals = torch.linspace(1.0, 5.0, S).unsqueeze(0).expand(N, S)
        return rgb, sigma, t_vals

    def test_output_shapes(self, renderer):
        N, S = 16, 32
        rgb, sigma, t_vals = self._dummy_inputs(N, S)
        out = renderer(rgb, sigma, t_vals)
        assert out["color"].shape == (N, 3)
        assert out["alpha"].shape == (N,)
        assert out["weights"].shape == (N, S)

    def test_color_in_0_1(self, renderer):
        rgb, sigma, t_vals = self._dummy_inputs()
        out = renderer(rgb, sigma, t_vals)
        assert out["color"].min() >= -1e-5
        assert out["color"].max() <= 1.0 + 1e-5

    def test_weights_sum_to_leq_1(self, renderer):
        rgb, sigma, t_vals = self._dummy_inputs()
        out = renderer(rgb, sigma, t_vals)
        weight_sum = out["weights"].sum(-1)
        assert (weight_sum <= 1.0 + 1e-4).all()

    def test_empty_scene_white_bg(self, renderer):
        """Near-zero density → white background."""
        N, S = 8, 16
        rgb = torch.zeros(N, S, 3)          # all black geometry
        sigma = torch.zeros(N, S)            # transparent
        t_vals = torch.linspace(1.0, 5.0, S).unsqueeze(0).expand(N, S)
        out = renderer(rgb, sigma, t_vals)
        # With white_bg the colour should approach (1,1,1) for transparent rays
        assert torch.allclose(out["color"], torch.ones(N, 3), atol=0.01)

    def test_opaque_scene_returns_surface_color(self, renderer):
        """Very high density → output ≈ first sample colour."""
        N, S = 4, 32
        target_color = torch.tensor([0.8, 0.2, 0.5])
        rgb = target_color.unsqueeze(0).unsqueeze(0).expand(N, S, 3).clone()
        sigma = torch.full((N, S), 1e6)     # fully opaque
        t_vals = torch.linspace(1.0, 5.0, S).unsqueeze(0).expand(N, S)
        out = renderer(rgb, sigma, t_vals)
        assert torch.allclose(out["color"], target_color.unsqueeze(0).expand(N, 3), atol=0.01)

    def test_transmittance_monotone(self, renderer):
        """Transmittance must be non-increasing along each ray."""
        N, S = 4, 32
        rgb = torch.rand(N, S, 3)
        sigma = torch.rand(N, S) * 2.0
        t_vals = torch.linspace(1.0, 5.0, S).unsqueeze(0).expand(N, S)

        # Re-implement transmittance for inspection
        deltas = t_vals[..., 1:] - t_vals[..., :-1]
        deltas = torch.cat([deltas, torch.full_like(deltas[..., :1], 1e10)], dim=-1)
        alpha = 1.0 - torch.exp(-sigma * deltas)
        ones = torch.ones_like(alpha[..., :1])
        T = torch.cumprod(torch.cat([ones, 1.0 - alpha + 1e-10], dim=-1), dim=-1)[..., :-1]

        diffs = T[..., 1:] - T[..., :-1]
        assert (diffs <= 1e-5).all(), "Transmittance should be non-increasing"

    def test_gradients_flow(self, renderer):
        N, S = 8, 16
        rgb = torch.rand(N, S, 3, requires_grad=True)
        sigma = torch.rand(N, S, requires_grad=True)
        t_vals = torch.linspace(1.0, 5.0, S).unsqueeze(0).expand(N, S)
        out = renderer(rgb, sigma, t_vals)
        out["color"].sum().backward()
        assert rgb.grad is not None
        assert sigma.grad is not None


# ─────────────────────────────────────────────
# SyntheticScene
# ─────────────────────────────────────────────

class TestSyntheticScene:
    @pytest.fixture
    def scene(self):
        return SyntheticScene(image_size=(16, 16), num_samples=32)

    def test_camera_ray_shapes(self, scene):
        origins, dirs = scene.camera_rays(0.0, 0.0)
        N = 16 * 16
        assert origins.shape == (N, 3)
        assert dirs.shape == (N, 3)

    def test_ray_dirs_unit_length(self, scene):
        _, dirs = scene.camera_rays(0.5, 0.3)
        norms = dirs.norm(dim=-1)
        assert torch.allclose(norms, torch.ones_like(norms), atol=1e-5)

    def test_sample_points_shape(self, scene):
        origins, dirs = scene.camera_rays(0.0, 0.0)
        pts, dir_pts, t_vals = scene.sample_points(origins, dirs)
        N = 16 * 16
        S = scene.num_samples
        assert pts.shape == (N, S, 3)
        assert dir_pts.shape == (N, S, 3)
        assert t_vals.shape == (N, S)

    def test_gt_render_shape_and_range(self, scene):
        img = scene.render_gt(0.0, 0.0)
        assert img.shape == (16, 16, 3)
        assert img.min() >= 0.0
        assert img.max() <= 1.0

    def test_gt_different_views_differ(self, scene):
        img1 = scene.render_gt(0.0, 0.0)
        img2 = scene.render_gt(math.pi, 0.0)
        assert not torch.allclose(img1, img2)

    def test_t_vals_monotone(self, scene):
        origins, dirs = scene.camera_rays(0.0, 0.0)
        _, _, t_vals = scene.sample_points(origins, dirs, perturb=False)
        diffs = t_vals[0, 1:] - t_vals[0, :-1]
        assert (diffs > 0).all()


# ─────────────────────────────────────────────
# End-to-end rendering (no training)
# ─────────────────────────────────────────────

class TestEndToEndRender:
    def test_forward_pass_no_crash(self):
        model = TinyNeRF()
        renderer = VolumeRenderer()
        scene = SyntheticScene(image_size=(8, 8), num_samples=16)

        origins, dirs = scene.camera_rays(0.0, 0.0)
        pts, dir_pts, t_vals = scene.sample_points(origins, dirs, perturb=False)

        N, S, _ = pts.shape
        rgb_pred, sigma_pred = model(pts.reshape(N * S, 3), dir_pts.reshape(N * S, 3))
        rgb_pred = rgb_pred.reshape(N, S, 3)
        sigma_pred = sigma_pred.reshape(N, S)

        out = renderer(rgb_pred, sigma_pred, t_vals)
        assert out["color"].shape == (N, 3)

    def test_loss_decreases_with_training(self):
        """A few gradient steps should reduce MSE loss."""
        import torch.optim as optim

        model = TinyNeRF(hidden_dim=32, num_layers=2)
        renderer = VolumeRenderer()
        scene = SyntheticScene(image_size=(8, 8), num_samples=16)
        optimizer = optim.Adam(model.parameters(), lr=1e-3)

        origins, dirs = scene.camera_rays(0.0, 0.0)
        pts, dir_pts, t_vals = scene.sample_points(origins, dirs, perturb=False)
        gt = scene.render_gt(0.0, 0.0).reshape(-1, 3)
        N, S, _ = pts.shape

        losses = []
        for _ in range(10):
            optimizer.zero_grad()
            rgb_pred, sigma_pred = model(pts.reshape(N * S, 3), dir_pts.reshape(N * S, 3))
            rgb_pred = rgb_pred.reshape(N, S, 3)
            sigma_pred = sigma_pred.reshape(N, S)
            out = renderer(rgb_pred, sigma_pred, t_vals)
            loss = torch.mean((out["color"] - gt) ** 2)
            loss.backward()
            optimizer.step()
            losses.append(loss.item())

        # Loss should trend down (not necessarily monotone, but last < first)
        assert losses[-1] < losses[0], f"Loss did not decrease: {losses}"
