"""简化版反应扩散算法。提供对墨场的扩散与耗散更新。"""

from __future__ import annotations

import numpy as np


class ReactionDiffusion:
    """一个轻量级的墨扩散模型，使用邻域平均与衰减模拟水墨渗透。"""

    def __init__(self, diffusion_rate: float = 0.08, decay: float = 0.995) -> None:
        self.diffusion_rate = diffusion_rate
        self.decay = decay

    def step(self, field: np.ndarray) -> np.ndarray:
        """对单步墨场执行扩散。"""
        up = np.roll(field, -1, axis=0)
        down = np.roll(field, 1, axis=0)
        left = np.roll(field, -1, axis=1)
        right = np.roll(field, 1, axis=1)
        neighbors = (up + down + left + right) * 0.25
        updated = field + self.diffusion_rate * (neighbors - field)
        updated *= self.decay
        np.clip(updated, 0.0, 1.0, out=updated)
        return updated
