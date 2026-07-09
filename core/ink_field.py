"""墨场模拟核心。维护二维墨浓度矩阵，并提供更新与渲染接口。"""

from __future__ import annotations

import numpy as np

from core.reaction_diffusion import ReactionDiffusion


class InkField:
    """一个轻量级的墨场，使用二维数值矩阵表示墨浓度。"""

    def __init__(self, width: int = 512, height: int = 512) -> None:
        self.width = width
        self.height = height
        self.field = np.zeros((height, width), dtype=np.float32)
        self.persistence = np.zeros((height, width), dtype=np.float32)
        self.diffuser = ReactionDiffusion(diffusion_rate=0.08, decay=0.995)

    def inject(
        self,
        x: int,
        y: int,
        amount: float,
        radius: int | None = None,
        direction: float = 0.0,
        aspect_ratio: float = 1.0,
        wetness: float = 0.35,
    ) -> None:
        """在指定位置注入墨浓度，并通过方向性形状模拟毛笔笔锋。"""
        if not (0 <= x < self.width and 0 <= y < self.height):
            return

        radius = radius or max(2, int(3 + amount * 4))
        radius_x = max(2, int(radius * max(1.0, aspect_ratio)))
        radius_y = max(2, int(radius * max(0.7, 2.0 - max(1.0, aspect_ratio))))
        y0 = max(0, y - radius_x)
        y1 = min(self.height, y + radius_x + 1)
        x0 = max(0, x - radius_y)
        x1 = min(self.width, x + radius_y + 1)

        yy, xx = np.mgrid[y0:y1, x0:x1]
        dx = xx - x
        dy = yy - y
        cos_a = np.cos(direction)
        sin_a = np.sin(direction)
        dx_rot = dx * cos_a + dy * sin_a
        dy_rot = -dx * sin_a + dy * cos_a
        dist = (dx_rot / max(1, radius_x)) ** 2 + (dy_rot / max(1, radius_y)) ** 2
        mask = np.exp(-dist * 1.6).astype(np.float32)
        strength = np.clip(amount * (2.2 + wetness * 1.4) * mask, 0.0, 1.0)

        self.persistence[y0:y1, x0:x1] = np.maximum(self.persistence[y0:y1, x0:x1], strength)
        self.field[y0:y1, x0:x1] = np.maximum(self.field[y0:y1, x0:x1], strength)

    def update(self) -> None:
        """执行简化版扩散更新，同时保留一层稳定的墨痕。"""
        diffused = self.diffuser.step(self.field)
        self.persistence *= 0.9985
        self.field = np.maximum(diffused * 0.99, self.persistence * 0.985)
        self.field = np.clip(self.field, 0.0, 1.0)

    def clear(self) -> None:
        """清空墨场。"""
        self.field.fill(0.0)
        self.persistence.fill(0.0)

    def to_image(self) -> np.ndarray:
        """将墨场转换为可显示的灰度/透明图像。"""
        density = np.clip(self.field, 0.0, 1.0)
        gray = (1.0 - density) * 255.0
        gray = gray.astype(np.uint8)
        alpha = np.clip((density * 320.0).astype(np.uint8), 0, 255)
        image = np.zeros((self.height, self.width, 4), dtype=np.uint8)
        image[..., 0] = gray * 0.16
        image[..., 1] = gray * 0.2
        image[..., 2] = gray * 0.24
        image[..., 3] = alpha
        return image
