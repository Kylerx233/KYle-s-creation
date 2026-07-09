"""处理宣纸背景纹理与生成默认纸张效果。"""

from __future__ import annotations

from pathlib import Path
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


class PaperTexture:
    """负责生成和保存宣纸纹理背景。"""

    def __init__(self, size: tuple[int, int] = (1200, 900)) -> None:
        self.size = size
        assets_dir = Path(__file__).resolve().parent.parent / "assets"
        self.texture_path = assets_dir / "background.png"
        self.fallback_texture = assets_dir / "paper_texture.png"
        self.image = self._load_or_create_texture()

    def _load_or_create_texture(self) -> Image.Image:
        """优先加载 assets/background.png，若不存在则使用 paper_texture.png 或自动生成噪声纹理。"""
        if self.texture_path.exists():
            image = Image.open(self.texture_path).convert("RGBA")
            if image.size == self.size:
                return image
            if self.size == (1920, 1080):
                return image.resize(self.size, Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", self.size, (245, 232, 200, 255))
            offset = ((self.size[0] - image.width) // 2, (self.size[1] - image.height) // 2)
            canvas.paste(image, offset)
            return canvas
        source_path = self.fallback_texture
        if source_path.exists():
            image = Image.open(source_path).convert("RGBA")
            image = image.resize(self.size, Image.Resampling.LANCZOS)
            return image

        image = Image.new("RGBA", self.size, (245, 232, 200, 255))
        draw = ImageDraw.Draw(image)
        for _ in range(5000):
            x = random.randint(0, self.size[0] - 1)
            y = random.randint(0, self.size[1] - 1)
            alpha = random.randint(8, 28)
            color = (random.randint(120, 180), random.randint(100, 150), random.randint(80, 120), alpha)
            draw.point((x, y), fill=color)

        image = image.filter(ImageFilter.GaussianBlur(radius=0.3))
        return image

    def as_pil_image(self) -> Image.Image:
        """返回当前宣纸纹理。"""
        return self.image.copy()

    def as_numpy_array(self) -> np.ndarray:
        """返回 NumPy 数组格式的纹理。"""
        return np.array(self.as_pil_image(), dtype=np.uint8)
