"""py5 粒子交互 Demo，用于测试青绿山水画卷粒子系统。"""

from pathlib import Path
from typing import Optional

from PIL import Image
import py5


IMAGE_PATHS = [Path("assets/jiangshan.png"), Path("assets/background.png")]
SAMPLE_STEP = 8
TARGET_WIDTH = 760
BASE_PARTICLE_SIZE = 4.0
FORCE_RADIUS = 120


class Particle:
    def __init__(self, x: float, y: float, color: tuple[int, int, int, int]) -> None:
        self.x = x
        self.y = y
        self.origin_x = x
        self.origin_y = y
        self.color = color
        self.alpha = color[3]
        self.size = py5.random(3.6, 5.2)
        self.vx = 0.0
        self.vy = 0.0
        self.state = "FORM"
        self.noise_offset = py5.random(1000)

    def apply_force(self, fx: float, fy: float, strength: float) -> None:
        dx = self.x - fx
        dy = self.y - fy
        dist_sq = dx * dx + dy * dy
        if dist_sq >= FORCE_RADIUS * FORCE_RADIUS:
            return
        dist = py5.sqrt(dist_sq) + 0.001
        force = strength * (1.0 - dist / FORCE_RADIUS)
        self.vx += (dx / dist) * force
        self.vy += (dy / dist) * force
        self.state = "SCATTER"

    def update(self) -> None:
        noise_strength = 0.45
        noise_x = py5.noise(self.origin_x * 0.013, self.origin_y * 0.013, py5.frame_count * 0.008 + self.noise_offset)
        noise_y = py5.noise(self.origin_y * 0.013, self.origin_x * 0.013, py5.frame_count * 0.008 + self.noise_offset)
        self.vx += (noise_x - 0.5) * noise_strength
        self.vy += (noise_y - 0.5) * noise_strength

        self.x += self.vx
        self.y += self.vy

        self.vx *= 0.92
        self.vy *= 0.92

        if self.state == "SCATTER":
            if py5.dist(self.x, self.y, self.origin_x, self.origin_y) > 12:
                self.state = "RETURN"

        if self.state == "RETURN":
            self.vx += (self.origin_x - self.x) * 0.03
            self.vy += (self.origin_y - self.y) * 0.03
            if py5.dist(self.x, self.y, self.origin_x, self.origin_y) < 2.5:
                self.state = "FORM"
                self.vx *= 0.5
                self.vy *= 0.5

        self.x = py5.lerp(self.x, self.origin_x, 0.01)
        self.y = py5.lerp(self.y, self.origin_y, 0.01)

    def draw(self) -> None:
        r, g, b, a = self.color
        r = py5.lerp(r, 96, 0.3)
        g = py5.lerp(g, 180, 0.25)
        b = py5.lerp(b, 210, 0.3)
        a = py5.lerp(a, 160, 0.15)
        py5.fill(r, g, b, a)
        py5.no_stroke()
        py5.ellipse(self.x, self.y, self.size, self.size)


particles: list[Particle] = []
img_w = 0
img_h = 0


def load_image_pixels() -> tuple[Image.Image, int, int]:
    image_path: Optional[Path] = None
    for path in IMAGE_PATHS:
        if path.exists():
            image_path = path
            break
    if image_path is None:
        raise FileNotFoundError("未找到 assets/jiangshan.png 或 assets/background.png。")

    source = Image.open(image_path).convert("RGBA")
    img_w = TARGET_WIDTH
    img_h = int(source.height * (TARGET_WIDTH / source.width))
    source = source.resize((img_w, img_h), Image.LANCZOS)
    return source, img_w, img_h


def apply_force(x: float, y: float, strength: float) -> None:
    for particle in particles:
        particle.apply_force(x, y, strength)


def setup() -> None:
    global particles, img_w, img_h

    py5.size(960, 760)
    py5.frame_rate(60)
    py5.no_stroke()

    source, img_w, img_h = load_image_pixels()
    offset_x = (py5.width - img_w) / 2
    offset_y = (py5.height - img_h) / 2

    for y in range(0, img_h, SAMPLE_STEP):
        for x in range(0, img_w, SAMPLE_STEP):
            r, g, b, a = source.getpixel((x, y))
            if a < 20:
                continue
            brightness = 0.299 * r + 0.587 * g + 0.114 * b
            if brightness > 245:
                continue
            px = x + offset_x
            py = y + offset_y
            particles.append(Particle(px, py, (r, g, b, a)))

    print(f"Loaded particles: {len(particles)}, image size=({img_w},{img_h})")


def draw() -> None:
    py5.background(235, 240, 235)
    py5.fill(42, 72, 65, 24)
    py5.rect(0, 0, py5.width, py5.height)

    py5.blend_mode(py5.BLEND)
    for particle in particles:
        particle.update()
        particle.draw()

    if py5.is_mouse_pressed:
        apply_force(py5.mouse_x, py5.mouse_y, 1.0)

    py5.fill(20, 60, 65)
    py5.text_size(14)
    py5.text_align(py5.LEFT, py5.TOP)
    py5.text(f"粒子数量: {len(particles)}", 16, 16)
    py5.text(f"FPS: {int(py5.get_frame_rate())}", 16, 38)
    py5.text("点击/拖动扰动粒子，松手后回归山水形态", 16, 60)


def mouse_pressed() -> None:
    apply_force(py5.mouse_x, py5.mouse_y, 1.3)


def key_pressed() -> None:
    if py5.key == 's' or py5.key == 'S':
        py5.save_frame("py5_particle_snapshot-####.png")
        print("Saved snapshot")


def _get_image_path() -> Path | None:
    import argparse

    parser = argparse.ArgumentParser(description="py5 粒子 Demo")
    parser.add_argument("--image", required=False, help="输入要加载的图像路径")
    args = parser.parse_args()
    if args.image:
        return Path(args.image)
    return None


if __name__ == "__main__":
    image_path = _get_image_path()
    if image_path is not None:
        IMAGE_PATHS.insert(0, image_path)
    py5.run_sketch()
