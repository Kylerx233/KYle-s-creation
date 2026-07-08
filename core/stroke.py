"""管理单次笔触轨迹数据，方便后续扩展为更复杂的绘画逻辑。"""

from dataclasses import dataclass, field
from typing import List
import math


@dataclass
class StrokePoint:
    """表示一次绘制过程中某一点的状态。"""

    x: float
    y: float
    timestamp: float
    speed: float
    size: float
    density: float


@dataclass
class Stroke:
    """保存一段完整笔触。"""

    points: List[StrokePoint] = field(default_factory=list)

    def add_point(
        self,
        point: StrokePoint | float,
        y: float | None = None,
        timestamp: float | None = None,
        speed: float = 0.0,
        size: float = 1.0,
        density: float = 1.0,
    ) -> None:
        """追加一个笔触点。

        支持直接传入 StrokePoint 实例，或传入 x, y, timestamp 等原始值。
        """
        if isinstance(point, StrokePoint):
            self.points.append(point)
            return

        if y is None or timestamp is None:
            raise ValueError("Stroke.add_point requires x, y and timestamp when not passing StrokePoint")

        self.points.append(StrokePoint(point, y, timestamp, speed, size, density))

    def analyze(self) -> dict[str, float]:
        """分析当前笔触轨迹并返回速度、方向和曲率。"""
        if len(self.points) < 2:
            return {"speed": 0.0, "direction": 0.0, "curvature": 0.0}

        last = self.points[-1]
        prev = self.points[-2]
        dx = last.x - prev.x
        dy = last.y - prev.y
        dt = max(1e-3, last.timestamp - prev.timestamp)
        speed = ((dx * dx + dy * dy) ** 0.5) / dt
        direction = float(0.0)
        if dx != 0.0 or dy != 0.0:
            direction = float((180.0 / 3.141592653589793) * (math.atan2(dy, dx)))

        curvature = 0.0
        if len(self.points) >= 3:
            prev2 = self.points[-3]
            v1x = prev.x - prev2.x
            v1y = prev.y - prev2.y
            v2x = last.x - prev.x
            v2y = last.y - prev.y
            norm1 = max(1e-3, (v1x * v1x + v1y * v1y) ** 0.5)
            norm2 = max(1e-3, (v2x * v2x + v2y * v2y) ** 0.5)
            dot = (v1x * v2x + v1y * v2y) / (norm1 * norm2)
            dot = max(-1.0, min(1.0, dot))
            curvature = float(1.0 - abs(dot))

        return {"speed": speed, "direction": direction, "curvature": curvature}
