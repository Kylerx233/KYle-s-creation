"""根据笔触轨迹生成毛笔式墨注入参数。"""

from __future__ import annotations

import numpy as np

from core.stroke import Stroke


class InkBrushEngine:
    """从笔触轨迹分析中输出毛笔相关参数。"""

    def __init__(self, base_size: float = 5.0) -> None:
        self.base_size = base_size

    def evaluate(self, stroke: Stroke, input_speed: float | None = None) -> dict[str, float]:
        """根据当前笔触输出半径、墨浓度、扩散强度、湿度和方向。"""
        if not stroke.points:
            return {
                "brush_size": 4.0,
                "ink_density": 0.55,
                "diffusion_strength": 0.22,
                "wetness": 0.7,
                "ink_value": 0.8,
                "direction": 0.0,
                "aspect_ratio": 1.0,
            }

        analysis = stroke.analyze()
        direction = float(analysis["direction"])

        brush_size = 8.2
        ink_density = 0.86
        wetness = 0.92
        diffusion_strength = 0.42
        ink_value = 0.95
        aspect_ratio = 1.0

        return {
            "brush_size": brush_size,
            "ink_density": ink_density,
            "diffusion_strength": diffusion_strength,
            "wetness": wetness,
            "ink_value": ink_value,
            "direction": direction,
            "aspect_ratio": aspect_ratio,
        }
