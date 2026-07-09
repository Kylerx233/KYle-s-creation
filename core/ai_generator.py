"""AI 图像生成模块。"""

from __future__ import annotations

import base64
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
            image_data = base64.b64encode(f.read()).decode("ascii")

        data = {
            "model": self.config.model,
            "prompt": prompt,
            "size": "1920x1920",
            "image_base64": image_data,
        }

        url = self.config.api_base.rstrip("/")
        try:
            response = requests.post(
                url,
                headers=self.config.get_headers(),
                json=data,
                timeout=120,
            )
        except requests.RequestException as exc:
            raise ConnectionError(f"网络请求失败：{exc}") from exc

        if response.status_code != 200:
            raise RuntimeError(f"AI 生成失败：{response.status_code} {response.text}")

        result = response.json()
        if isinstance(result, list):
            if not result:
                raise ValueError("AI 返回结果格式错误：空列表。")
            result = result[0]

        if not isinstance(result, dict):
            raise ValueError("AI 返回结果格式错误：非 JSON 字典或列表。")

        data_field = result.get("data")
        if isinstance(data_field, list) and data_field:
            data_field = data_field[0]

        image_url = (
            result.get("image_url")
            or (data_field.get("url") if isinstance(data_field, dict) else None)
        )
        image_base64 = (
            result.get("image_base64")
            or (data_field.get("b64_json") if isinstance(data_field, dict) else None)
        )

        output_path = Path("output") / "generated_landscape.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if image_base64:
            try:
                generated = base64.b64decode(image_base64)
            except Exception as exc:
                raise ValueError("AI 返回的 Base64 图像数据无法解码。") from exc
            output_path.write_bytes(generated)
            return str(output_path)

        if image_url:
            try:
                image_response = requests.get(image_url, timeout=120)
                image_response.raise_for_status()
            except requests.RequestException as exc:
                raise ConnectionError(f"下载生成图像失败：{exc}") from exc
            output_path.write_bytes(image_response.content)
            return str(output_path)

        raise ValueError("AI 返回结果中缺少生成图片数据。")
