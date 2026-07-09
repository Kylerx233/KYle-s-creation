"""Flow field module for particle motion."""

from __future__ import annotations

import math
import random


class FlowField:
    def __init__(self, width: int, height: int, cell_size: int = 80, speed: float = 0.28) -> None:
        self.width = width
        self.height = height
        self.cell_size = max(32, cell_size)
        self.cols = max(2, math.ceil(width / self.cell_size) + 1)
        self.rows = max(2, math.ceil(height / self.cell_size) + 1)
        self.speed = speed
        self.time = 0.0
        self.seed = random.randint(0, 2 ** 31 - 1)

    def update(self, dt: float) -> None:
        self.time += dt * self.speed

    def get_vector(self, x: float, y: float) -> tuple[float, float]:
        sx = x / self.cell_size
        sy = y / self.cell_size
        ix = math.floor(sx)
        iy = math.floor(sy)
        tx = self._fade(sx - ix)
        ty = self._fade(sy - iy)

        a = self._angle(ix, iy)
        b = self._angle(ix + 1, iy)
        c = self._angle(ix, iy + 1)
        d = self._angle(ix + 1, iy + 1)

        angle_x = self._lerp(self._lerp(math.cos(a), math.cos(b), tx), self._lerp(math.cos(c), math.cos(d), tx), ty)
        angle_y = self._lerp(self._lerp(math.sin(a), math.sin(b), tx), self._lerp(math.sin(c), math.sin(d), tx), ty)
        length = math.hypot(angle_x, angle_y)
        if length < 1e-6:
            return 0.0, 0.0
        return angle_x / length, angle_y / length

    def _angle(self, gx: int, gy: int) -> float:
        h = self._hash(gx, gy, int(self.time * 1000))
        return h * math.tau + math.sin((gx + gy) * 0.48 + self.time * 0.9) * 1.1

    def _hash(self, gx: int, gy: int, t: int) -> float:
        n = gx * 374761393 + gy * 668265263 + t * 98765431 + self.seed
        n = (n ^ (n >> 13)) * 1274126177
        n = (n ^ (n >> 16)) & 0xFFFFFFFF
        return ((n >> 16) & 0xFFFF) / 0xFFFF

    @staticmethod
    def _fade(t: float) -> float:
        return t * t * t * (t * (t * 6 - 15) + 10)

    @staticmethod
    def _lerp(a: float, b: float, t: float) -> float:
        return a + (b - a) * t
