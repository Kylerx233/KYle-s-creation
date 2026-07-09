"""粒子核心类。"""

from __future__ import annotations

import math
import random

from PyQt6.QtCore import QRectF, Qt
from PyQt6.QtGui import QColor, QPainter


class Particle:
    def __init__(self, x: float, y: float, color: tuple[int, int, int, int]) -> None:
        self.x = x
        self.y = y
        self.origin_x = x
        self.origin_y = y
        self.color = color
        self.alpha = color[3]
        self.size = max(1.0, min(2.5, (self.alpha / 255.0) * 2.4 + 0.9))
        self.vx = 0.0
        self.vy = 0.0
        self.history: list[tuple[float, float]] = [(x, y)]
        self.state = "FORM"
        self.noise_phase = random.random() * math.pi * 2
        self._age = 0

    def apply_force(self, fx: float, fy: float, strength: float, radius: float) -> None:
        dx = self.x - fx
        dy = self.y - fy
        dist_sq = dx * dx + dy * dy
        if dist_sq >= radius * radius:
            return
        dist = math.sqrt(dist_sq) + 1e-3
        force = strength * (1.0 - dist / radius)
        self.vx += (dx / dist) * force
        self.vy += (dy / dist) * force
        self.state = "SCATTER"

    def update(self, flow_x: float, flow_y: float) -> None:
        self.history.append((self.x, self.y))
        if len(self.history) > 4:
            self.history.pop(0)

        self._age += 1
        noise_strength = 0.24
        noise_x = math.sin(self._age * 0.064 + self.noise_phase) * noise_strength
        noise_y = math.cos(self._age * 0.057 + self.noise_phase) * noise_strength
        self.vx += flow_x * 0.08 + noise_x
        self.vy += flow_y * 0.08 + noise_y

        self.x += self.vx
        self.y += self.vy

        self.vx *= 0.90
        self.vy *= 0.90

        if self.state == "SCATTER":
            if math.hypot(self.x - self.origin_x, self.y - self.origin_y) > 16:
                self.state = "RETURN"

        if self.state == "RETURN":
            self.vx += (self.origin_x - self.x) * 0.025
            self.vy += (self.origin_y - self.y) * 0.025
            if math.hypot(self.x - self.origin_x, self.y - self.origin_y) < 3.0:
                self.state = "FORM"
                self.vx *= 0.5
                self.vy *= 0.5

        self.x += (self.origin_x - self.x) * 0.007
        self.y += (self.origin_y - self.y) * 0.007

    def draw(self, painter: QPainter) -> None:
        r, g, b, a = self.color
        alpha = int(max(80, min(220, a * 0.88)))
        color = QColor(r, g, b, alpha)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(color)
        radius = self.size * 1.9

        if len(self.history) > 1:
            fade_step = alpha / len(self.history)
            for i, (hx, hy) in enumerate(self.history[:-1]):
                trail_alpha = int(max(30, fade_step * (i + 1)))
                painter.setBrush(QColor(r, g, b, trail_alpha))
                painter.drawEllipse(QRectF(hx - radius * 0.45, hy - radius * 0.45, radius * 0.9, radius * 0.9))

        painter.setBrush(color)
        painter.drawEllipse(QRectF(self.x - radius * 0.5, self.y - radius * 0.5, radius, radius))
