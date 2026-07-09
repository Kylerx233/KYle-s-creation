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

    def __init__(self, field, base_size: int = 20) -> None:
        self.field = field
        self.base_size = base_size
        self._stamp_cache: dict[tuple[int, int, int], Image.Image] = {}

    def create_stamp(self, x: float, y: float, speed: float, direction: float, density: float = 0.8) -> Image.Image:
        """根据输入生成一个带扩散效果的墨迹印章。"""
        size = max(14, int(self.base_size * (0.8 + density * 0.6)))
        if speed > 10:
            size = max(12, int(size * 0.88))
            density *= 0.8
        elif speed < 3:
            size = int(size * 1.08)
            density = min(1.0, density * 1.1)

        cache_key = (size, int(direction * 10), int(density * 100))
        if cache_key in self._stamp_cache:
            return self._stamp_cache[cache_key]

        stamp = Image.new("RGBA", (size * 3, size * 3), (0, 0, 0, 0))
        draw = ImageDraw.Draw(stamp)
        center = size * 1.5

        core_radius = max(4, int(size * 0.28))
        core_alpha = int(230 * density)
        draw.ellipse(
            (
                center - core_radius,
                center - core_radius,
                center + core_radius,
                center + core_radius,
            ),
            fill=(18, 18, 20, core_alpha),
        )

        for layer in range(5):
            layer_radius = int(size * (1.0 - layer * 0.12))
            alpha = int(180 * density * (0.7 + 0.08 * layer))
            alpha = max(10, min(220, alpha))
            spread = int(layer_radius * 0.7)
            for _ in range(18 + layer * 12):
                angle = random.random() * math.pi * 2
                radius_offset = random.random() ** 1.5 * spread
                rx = int(center + math.cos(angle) * radius_offset)
                ry = int(center + math.sin(angle) * radius_offset)
                draw.ellipse((rx - 1, ry - 1, rx + 1, ry + 1), fill=(20, 20, 22, alpha))

        line_length = int(size * 0.9)
        dx = math.cos(direction) * line_length
        dy = math.sin(direction) * line_length
        for i in range(2):
            offset = i * 1.0
            draw.line(
                (
                    center - dx * 0.25 + offset,
                    center - dy * 0.25 + offset,
                    center + dx * 0.25 + offset,
                    center + dy * 0.25 + offset,
                ),
                fill=(18, 18, 20, int(160 * density)),
                width=max(1, int(size * 0.18)),
            )

        stamp = stamp.filter(ImageFilter.GaussianBlur(radius=0.9))
        core_after_blur_alpha = int(core_alpha * 0.78)
        draw = ImageDraw.Draw(stamp)
        draw.ellipse(
            (
                center - core_radius,
                center - core_radius,
                center + core_radius,
                center + core_radius,
            ),
            fill=(18, 18, 20, max(core_after_blur_alpha, 160)),
        )
        stamp = stamp.filter(ImageFilter.UnsharpMask(radius=1.2, percent=15, threshold=2))
        self._stamp_cache[cache_key] = stamp
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

    def apply(self, x: int, y: int, speed: float, params: dict[str, float] | None = None) -> None:
        """将当前笔刷状态注入到墨场。"""
        if params is None:
            params = {
                "brush_size": 4.0,
                "ink_density": 0.6,
                "direction": 0.0,
                "aspect_ratio": 1.0,
                "wetness": 0.5,
            }

        ink_density = float(params.get("ink_density", 0.6))
        direction = float(params.get("direction", 0.0))
        aspect_ratio = float(params.get("aspect_ratio", 1.0))
        wetness = float(params.get("wetness", 0.5))
        brush_size = float(params.get("brush_size", 8.2))

        stamp = self.create_stamp(x, y, speed, direction, ink_density)
        alpha_layer = np.array(stamp.split()[-1], dtype=np.float32) / 255.0
        if alpha_layer.size == 0:
            return

        amount = min(1.0, max(0.08, ink_density * 0.9))
        scaled_alpha = alpha_layer * amount

        stamp_w, stamp_h = stamp.size
        half_w = stamp_w // 2
        half_h = stamp_h // 2
        y0 = max(0, y - half_h)
        x0 = max(0, x - half_w)
        y1 = min(self.field.height, y + half_h)
        x1 = min(self.field.width, x + half_w)

        sy0 = max(0, half_h - y)
        sx0 = max(0, half_w - x)
        sy1 = sy0 + (y1 - y0)
        sx1 = sx0 + (x1 - x0)

        if y1 <= y0 or x1 <= x0:
            return

        patch = scaled_alpha[sy0:sy1, sx0:sx1]
        target_region = self.field.field[y0:y1, x0:x1]
        if patch.shape != target_region.shape:
            target_h, target_w = target_region.shape
            patch_h, patch_w = patch.shape
            if patch_h > target_h or patch_w > target_w:
                patch = patch[:target_h, :target_w]
            else:
                padded = np.zeros((target_h, target_w), dtype=patch.dtype)
                padded[:patch_h, :patch_w] = patch
                patch = padded

        self.field.field[y0:y1, x0:x1] = np.maximum(target_region, patch)
        self.field.persistence[y0:y1, x0:x1] = np.maximum(self.field.persistence[y0:y1, x0:x1], patch)
