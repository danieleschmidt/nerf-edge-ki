"""
VolumeRenderer: differentiable volume rendering via alpha compositing.

Algorithm
---------
For each ray with N sample points at distances t_0 … t_{N-1}:

    δ_i  = t_{i+1} - t_i               (distance between adjacent samples)
    α_i  = 1 - exp(-σ_i δ_i)           (alpha / opacity per step)
    T_i  = Π_{j<i} (1 - α_j)           (accumulated transmittance)
    C(r) = Σ_i  T_i α_i c_i            (final composite colour)
    A(r) = Σ_i  T_i α_i                (accumulated alpha / opacity mask)

Reference:
    Mildenhall et al., "NeRF: Representing Scenes as Neural Radiance Fields
    for View Synthesis", ECCV 2020.
"""

import torch
import torch.nn as nn


class VolumeRenderer(nn.Module):
    """
    Differentiable volume renderer.

    Args:
        white_bg: Composite onto a white background. Default True.
    """

    def __init__(self, white_bg: bool = True) -> None:
        super().__init__()
        self.white_bg = white_bg

    # ------------------------------------------------------------------
    def forward(
        self,
        rgb: torch.Tensor,
        sigma: torch.Tensor,
        t_vals: torch.Tensor,
    ) -> dict[str, torch.Tensor]:
        """
        Render rays by alpha compositing.

        Args:
            rgb:    (N, S, 3) per-sample colours.
            sigma:  (N, S)    per-sample densities.
            t_vals: (N, S)    sample distances along the ray.

        Returns:
            dict with:
                "color"  (N, 3) — rendered pixel colour
                "alpha"  (N,)   — accumulated opacity
                "weights"(N, S) — per-sample compositing weights
        """
        # Interval lengths δ_i
        deltas = t_vals[..., 1:] - t_vals[..., :-1]           # (N, S-1)
        # Last interval extends to infinity
        inf = torch.full_like(deltas[..., :1], 1e10)
        deltas = torch.cat([deltas, inf], dim=-1)              # (N, S)

        # α_i = 1 - exp(-σ_i δ_i)
        alpha = 1.0 - torch.exp(-sigma * deltas)               # (N, S)

        # T_i = cumprod(1 - α_{j<i}),  with T_0 = 1
        ones = torch.ones_like(alpha[..., :1])
        transmittance = torch.cumprod(
            torch.cat([ones, 1.0 - alpha + 1e-10], dim=-1), dim=-1
        )[..., :-1]                                            # (N, S)

        # Compositing weights w_i = T_i α_i
        weights = transmittance * alpha                        # (N, S)

        # Composite colour
        color = (weights.unsqueeze(-1) * rgb).sum(dim=-2)      # (N, 3)

        # Accumulated alpha
        acc_alpha = weights.sum(dim=-1)                        # (N,)

        # White background blend
        if self.white_bg:
            color = color + (1.0 - acc_alpha.unsqueeze(-1))

        return {"color": color, "alpha": acc_alpha, "weights": weights}
