"""加载 AI 接口配置。"""

from __future__ import annotations

import os
from pathlib import Path


class APIConfig:
    def __init__(self) -> None:
        root_dir = Path(__file__).resolve().parent.parent
        env_path = root_dir / ".env"
        if env_path.exists():
            from dotenv import load_dotenv

            load_dotenv(env_path)

        self.api_key = os.getenv("DOUBAO_API_KEY", "").strip()
        self.api_base = os.getenv("DOUBAO_API_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3/images/generations").strip()
        self.model = os.getenv("DOUBAO_MODEL", "doubao-seedream-5-0-260128").strip()

    def validate(self) -> None:
        if not self.api_key:
            raise ValueError("请在 .env 中配置 DOUBAO_API_KEY。")

    def get_headers(self) -> dict[str, str]:
        self.validate()
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
