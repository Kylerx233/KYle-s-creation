"""AI 图像生成模块。"""

from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Optional

import requests

from config.api_config import APIConfig


class AIImageGenerator:
    """通过 AI 接口生成图像。"""

    def __init__(self, config: Optional[APIConfig] = None) -> None:
        self.config = config or APIConfig()

    def generate(self, image_path: str, prompt: str) -> str:
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"输入图片不存在: {image_path}")

        self.config.validate()

        with path.open("rb") as f:
            image_data = f.read()

        # 这里使用 OpenAI 图像生成接口风格，后续替换其他厂商时只需改本函数
        url = f"{self.config.api_base}/images/generations"
        payload = {
            "model": self.config.model,
            "prompt": prompt,
            "image": base64.b64encode(image_data).decode("utf-8"),
            "size": "1024x1024",
        }

        response = requests.post(url, headers=self.config.get_headers(), json=payload, timeout=60)
        if response.status_code != 200:
            raise RuntimeError(f"AI 生成失败: {response.status_code} {response.text}")

        result = response.json()
        if not isinstance(result, dict) or "data" not in result or not result["data"]:
            raise ValueError("AI 返回结果格式错误。")

        data_item = result["data"][0]
        if "b64_json" not in data_item:
            raise ValueError("AI 返回结果中缺少图像数据。")

        generated = base64.b64decode(data_item["b64_json"])
        output_path = Path("output") / "generated_landscape.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(generated)
        return str(output_path)
