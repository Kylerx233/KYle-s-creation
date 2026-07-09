from __future__ import annotations

from dataclasses import dataclass
from math import atan2, hypot
from typing import List


@dataclass
class StrokePoint:
    x: float
    y: float
    timestamp: float
    speed: float = 0.0
    density: float = 0.8
    duration: float = 0.0


class Stroke:
    """A simple stroke container for drawing and analysis."""

    def __init__(self) -> None:
        self.points: List[StrokePoint] = []
        self._stationary_duration: float = 0.0

    def add_point(self, x: float, y: float, timestamp: float) -> None:
        speed = 0.0
        dt = 0.0
        if self.points:
            last = self.points[-1]
            dx = x - last.x
            dy = y - last.y
            dt = max(1e-3, timestamp - last.timestamp)
            speed = hypot(dx, dy) / dt

        density = float(min(1.0, max(0.35, 0.85 - speed * 0.02)))
        self.points.append(
            StrokePoint(
                x=x,
                y=y,
                timestamp=timestamp,
                speed=speed,
                density=density,
                duration=dt,
            )
        )

        if speed < 1.8:
            self._stationary_duration += dt
        else:
            self._stationary_duration = 0.0

    def analyze(self) -> dict[str, float]:
        if len(self.points) < 2:
            return {"speed": 0.0, "direction": 0.0, "curvature": 0.0, "stationary_time": 0.0}

        total_speed = 0.0
        directions: list[float] = []
        curvatures: list[float] = []

        for index in range(1, len(self.points)):
            current = self.points[index]
            total_speed += current.speed
            prev = self.points[index - 1]
            dx = current.x - prev.x
            dy = current.y - prev.y
            directions.append(atan2(dy, dx))

        for index in range(1, len(self.points) - 1):
            a = self.points[index - 1]
            b = self.points[index]
            c = self.points[index + 1]
            angle1 = atan2(b.y - a.y, b.x - a.x)
            angle2 = atan2(c.y - b.y, c.x - b.x)
            delta = abs((angle2 - angle1 + 3.14159) % (2 * 3.14159) - 3.14159)
            curvatures.append(delta)

        average_speed = total_speed / max(1, len(self.points) - 1)
        average_direction = float(sum(directions) / len(directions)) if directions else 0.0
        average_curvature = float(sum(curvatures) / len(curvatures)) if curvatures else 0.0

        return {
            "speed": average_speed,
            "direction": average_direction,
            "curvature": average_curvature,
            "stationary_time": min(self._stationary_duration, 1.2),
        }
