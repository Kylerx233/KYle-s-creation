"""粒子系统模块，负责加载图片并管理粒子。"""

from __future__ import annotations

from pathlib import Path

import py5

from core.particle.image_sampler import sample_image
from core.particle.particle import Particle


class ParticleSystem:
    def __init__(self, target_width: int = 760, sample_step: int = 8, force_radius: float = 120.0) -> None:
        self.particles: list[Particle] = []
        self.target_width = target_width
        self.sample_step = sample_step
        self.force_radius = force_radius
        self.image_path: Path | None = None
        self.offset_x = 0.0
        self.offset_y = 0.0
        self.img_w = 0
        self.img_h = 0

    def load_image(self, image_path: str) -> None:
        self.particles.clear()
        self.image_path = Path(image_path)
        if not self.image_path.exists():
            raise FileNotFoundError(f"图片未找到：{image_path}")

        self.img_w = self.target_width
        positions, self.img_h = sample_image(self.image_path, self.target_width, self.sample_step)
        if len(positions) == 0:
            raise ValueError("图片采样后没有生成粒子，请检查图片或采样参数。")

        self.offset_x = (py5.width - self.img_w) / 2
        self.offset_y = (py5.height - self.img_h) / 2

        for x, y, color in positions:
            self.particles.append(Particle(x + self.offset_x, y + self.offset_y, color))

    def interact(self, x: float, y: float, strength: float) -> None:
        for particle in self.particles:
            particle.apply_force(x, y, strength, self.force_radius)

    def update(self) -> None:
        for particle in self.particles:
            particle.update()

    def draw(self) -> None:
        for particle in self.particles:
            particle.draw()

    def particle_count(self) -> int:
        return len(self.particles)
