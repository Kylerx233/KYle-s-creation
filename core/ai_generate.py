"""AI 图像生成接口模块。后续将接入生成式 AI 服务。"""

from __future__ import annotations

import base64
from pathlib import Path

import requests

from core.api_config import APIConfig


class AIImageGenerator:
    def __init__(self, config: APIConfig | None = None) -> None:
        self.config = config or APIConfig()

    def generate(self, image_path: str, prompt: str) -> str:
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"输入图片不存在: {image_path}")

        self.config.validate()

        with path.open("rb") as f:
            image_data = base64.b64encode(f.read()).decode("ascii")

        payload = {
            "model": self.config.model,
            "prompt": prompt,
            "size": "1920x1920",
            "image_base64": image_data,
        }
        url = self.config.api_base.rstrip("/")
        response = requests.post(url, headers=self.config.get_headers(), json=payload, timeout=120)
        if response.status_code != 200:
            raise RuntimeError(f"AI 生成失败：{response.status_code} {response.text}")

        result = response.json()
        if isinstance(result, list):
            result = result[0]

        data_field = result.get("data")
        if isinstance(data_field, list) and data_field:
            data_field = data_field[0]

        image_url = result.get("image_url") or (data_field.get("url") if isinstance(data_field, dict) else None)
        image_base64 = result.get("image_base64") or (data_field.get("b64_json") if isinstance(data_field, dict) else None)

        output_path = Path("output") / "generated_landscape.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if image_base64:
            generated = base64.b64decode(image_base64)
            output_path.write_bytes(generated)
            return str(output_path)

        if image_url:
            image_response = requests.get(image_url, timeout=120)
            image_response.raise_for_status()
            output_path.write_bytes(image_response.content)
            return str(output_path)

        raise ValueError("AI 返回结果中缺少生成图片数据。")
