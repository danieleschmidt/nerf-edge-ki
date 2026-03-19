"""
TinyNeRF: compact MLP for Neural Radiance Fields optimised for edge devices.

Architecture
------------
* Input: (x,y,z) position + (θ,φ) view direction
* Positional encoding: 6 frequency levels for xyz, 4 for directions
* 4 hidden layers × 64 units (ReLU)
* Outputs: RGB colour (sigmoid) + volume density σ (softplus)

Total parameters: ~40 K — small enough for CPU inference on a Raspberry Pi.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F


def positional_encoding(x: torch.Tensor, num_levels: int = 6) -> torch.Tensor:
    """
    Apply sinusoidal positional encoding to input tensor.

    For each frequency k ∈ {0 … L-1} the encoding appends:
        [sin(2^k π x), cos(2^k π x)]

    Args:
        x:          Input tensor (..., D).
        num_levels: Number of frequency levels L.

    Returns:
        Encoded tensor (..., D + 2*D*num_levels).
    """
    encodings = [x]
    for k in range(num_levels):
        freq = 2.0 ** k * math.pi
        encodings.append(torch.sin(freq * x))
        encodings.append(torch.cos(freq * x))
    return torch.cat(encodings, dim=-1)


def _pos_enc_dim(input_dim: int, num_levels: int) -> int:
    """Return output dimensionality of positional encoding."""
    return input_dim + 2 * input_dim * num_levels


class TinyNeRF(nn.Module):
    """
    Tiny Neural Radiance Field network for edge devices.

    Parameters
    ----------
    pos_levels:  Frequency levels for (x,y,z) encoding.   Default 6.
    dir_levels:  Frequency levels for (θ,φ) encoding.     Default 4.
    hidden_dim:  Width of each hidden layer.              Default 64.
    num_layers:  Number of hidden layers.                 Default 4.
    """

    def __init__(
        self,
        pos_levels: int = 6,
        dir_levels: int = 4,
        hidden_dim: int = 64,
        num_layers: int = 4,
    ) -> None:
        super().__init__()
        self.pos_levels = pos_levels
        self.dir_levels = dir_levels

        pos_dim = _pos_enc_dim(3, pos_levels)   # 3 + 2*3*6 = 39
        dir_dim = _pos_enc_dim(3, dir_levels)   # 3 + 2*3*4 = 27

        # ------- position branch → density + feature ---------
        layers = [nn.Linear(pos_dim, hidden_dim), nn.ReLU(inplace=True)]
        for _ in range(num_layers - 1):
            layers += [nn.Linear(hidden_dim, hidden_dim), nn.ReLU(inplace=True)]
        self.pos_net = nn.Sequential(*layers)

        # density head (one scalar)
        self.sigma_head = nn.Linear(hidden_dim, 1)

        # ------- colour branch (features + view dir → RGB) ----
        self.color_net = nn.Sequential(
            nn.Linear(hidden_dim + dir_dim, hidden_dim // 2),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim // 2, 3),
        )

        self._init_weights()

    # ------------------------------------------------------------------
    def _init_weights(self) -> None:
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_uniform_(m.weight, nonlinearity="relu")
                nn.init.zeros_(m.bias)

    # ------------------------------------------------------------------
    def forward(
        self, positions: torch.Tensor, directions: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Evaluate NeRF at sampled 3-D points.

        Args:
            positions:  (..., 3) world-space sample positions.
            directions: (..., 3) unit ray directions (broadcast-compatible).

        Returns:
            rgb:    (..., 3) colour in [0, 1].
            sigma:  (...,)   volume density ≥ 0.
        """
        pos_enc = positional_encoding(positions, self.pos_levels)   # (..., 39)
        dir_enc = positional_encoding(directions, self.dir_levels)   # (..., 27)

        features = self.pos_net(pos_enc)                             # (..., H)
        sigma = F.softplus(self.sigma_head(features)).squeeze(-1)    # (...,)

        color_input = torch.cat([features, dir_enc], dim=-1)         # (..., H+27)
        rgb = torch.sigmoid(self.color_net(color_input))             # (..., 3)

        return rgb, sigma
