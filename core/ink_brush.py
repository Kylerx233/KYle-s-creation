"""实现基于鼠标运动的实时水墨笔刷效果。"""

from __future__ import annotations

import math
import random
import time
from typing import List, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

from core.stroke import Stroke, StrokePoint


class InkBrush:
    """根据速度与方向生成毛笔式墨迹纹理。"""

    def __init__(self, base_size: int = 18) -> None:
        self.base_size = base_size

    def create_stamp(self, x: float, y: float, speed: float, direction: float, density: float = 0.8) -> Image.Image:
        """根据输入生成一个带扩散效果的墨迹印章。"""
        size = max(6, int(self.base_size * (0.7 + density * 0.8)))
        if speed > 6:
            size = max(4, int(size * 0.7))
            density *= 0.75
        elif speed < 2:
            size = int(size * 1.2)
            density = min(1.0, density * 1.15)

        radius = size // 2
        stamp = Image.new("RGBA", (size * 3, size * 3), (0, 0, 0, 0))
        draw = ImageDraw.Draw(stamp)

        for _ in range(220):
            rx = random.randint(0, size * 3 - 1)
            ry = random.randint(0, size * 3 - 1)
            dist = math.hypot(rx - size * 1.5, ry - size * 1.5)
            if dist > radius * 2.3:
                continue
            alpha = int(max(8, 220 - dist * 10))
            alpha = max(8, min(220, alpha))
            if speed > 6:
                alpha = int(alpha * 0.6)
            if random.random() < 0.12:
                alpha = int(alpha * 0.7)
            draw.ellipse((rx - 1, ry - 1, rx + 1, ry + 1), fill=(0, 0, 0, alpha))

        stamp = stamp.filter(ImageFilter.GaussianBlur(radius=1.2))
        return stamp

    def render_stroke(self, stroke: Stroke, paper: Image.Image) -> Image.Image:
        """将一段笔触渲染到宣纸图像上。"""
        canvas = paper.copy()
        for point in stroke.points:
            brush = self.create_stamp(point.x, point.y, point.speed, 0.0, point.density)
            x = int(point.x - brush.width // 2)
            y = int(point.y - brush.height // 2)
            canvas.paste(brush, (x, y), brush)
        return canvas
