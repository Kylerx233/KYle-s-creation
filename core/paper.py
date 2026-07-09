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
        base_assets = Path(__file__).resolve().parent.parent / "assets"
        self.background_path = base_assets / "background.png"
        self.texture_path = base_assets / "paper_texture.png"
        self.image = self._load_or_create_texture()

    def _find_background_image(self, base_assets: Path) -> Path | None:
        """在 assets 目录中查找可用的背景图像文件。"""
        supported = ["background.png", "background.jpg", "background.jpeg", "wallpaper.png", "wallpaper.jpg", "wallpaper.jpeg"]
        for name in supported:
            path = base_assets / name
            if path.exists():
                return path

        for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp", "*.bmp"]:
            for path in sorted(base_assets.glob(ext)):
                if path.is_file():
                    return path
        return None

    def _load_or_create_texture(self) -> Image.Image:
        """优先加载背景图片资源，若不存在则自动生成宣纸噪声纹理。"""
        base_assets = Path(__file__).resolve().parent.parent / "assets"
        background_image = self._find_background_image(base_assets)
        if background_image is not None:
            image = Image.open(background_image).convert("RGBA")
            image = image.resize(self.size, Image.Resampling.LANCZOS)
            return image

        if self.texture_path.exists():
            image = Image.open(self.texture_path).convert("RGBA")
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
