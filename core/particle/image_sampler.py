"""图片采样模块，用于从山水图片中生成粒子数据。"""

from __future__ import annotations

from pathlib import Path
from typing import Tuple

from PIL import Image


def sample_image(image_path: Path, target_width: int, step: int) -> Tuple[list[Tuple[float, float, tuple[int, int, int, int]]], int]:
    source = Image.open(image_path).convert("RGBA")
    img_h = int(source.height * (target_width / source.width))
    source = source.resize((target_width, img_h), Image.LANCZOS)

    positions: list[Tuple[float, float, tuple[int, int, int, int]]] = []
    for y in range(0, img_h, step):
        for x in range(0, target_width, step):
            r, g, b, a = source.getpixel((x, y))
            if a < 20:
                continue
            brightness = 0.299 * r + 0.587 * g + 0.114 * b
            if brightness > 245:
                continue
            positions.append((x, y, (r, g, b, a)))

    return positions, img_h
