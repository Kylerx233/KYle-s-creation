"""简化版反应扩散算法。提供对墨场的扩散与耗散更新。"""

from __future__ import annotations

import numpy as np


class ReactionDiffusion:
    """一个轻量级的墨扩散模型，使用邻域平均与衰减模拟水墨渗透。"""

    def __init__(self, diffusion_rate: float = 0.08, decay: float = 0.998) -> None:
        self.diffusion_rate = diffusion_rate
        self.decay = decay

    def step(self, field: np.ndarray) -> np.ndarray:
        """对单步墨场执行扩散。"""
        padded = np.pad(field, 1, mode="edge")
        neighbors = (
            padded[:-2, 1:-1]
            + padded[2:, 1:-1]
            + padded[1:-1, :-2]
            + padded[1:-1, 2:]
        ) / 4.0
        updated = field + self.diffusion_rate * (neighbors - field)
        updated *= self.decay
        return np.clip(updated, 0.0, 1.0)
