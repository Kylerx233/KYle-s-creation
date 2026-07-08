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
        speed = float(np.clip(analysis["speed"], 0.2, 20.0))
        if input_speed is not None:
            speed = float(np.clip(input_speed, 0.2, 20.0))
        direction = float(analysis["direction"])
        curvature = float(np.clip(analysis["curvature"], 0.0, 1.5))

        speed_factor = 1.0 - min(speed / 20.0, 1.0)
        brush_size = float(np.clip(2.2 + speed_factor * 4.5 + curvature * 0.6, 2.0, 7.5))
        ink_density = float(np.clip(0.65 + speed_factor * 0.85 + curvature * 0.08, 0.4, 1.3))
        wetness = float(np.clip(0.45 + speed_factor * 0.7, 0.3, 0.95))
        diffusion_strength = float(np.clip(0.18 + speed_factor * 0.28 + curvature * 0.05, 0.12, 0.55))
        ink_value = float(np.clip(0.75 + speed_factor * 0.85, 0.5, 1.35))
        aspect_ratio = float(np.clip(1.0 + curvature * 0.25 + (1.0 - speed_factor) * 0.18, 0.85, 2.0))

        return {
            "brush_size": brush_size,
            "ink_density": ink_density,
            "diffusion_strength": diffusion_strength,
            "wetness": wetness,
            "ink_value": ink_value,
            "direction": direction,
            "aspect_ratio": aspect_ratio,
        }
