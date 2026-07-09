"""API 配置加载模块。"""

from __future__ import annotations

from pathlib import Path
import os

from dotenv import load_dotenv


class APIConfig:
    """加载 AI 接口配置。"""

    def __init__(self) -> None:
        root_dir = Path(__file__).resolve().parent.parent
        env_path = root_dir / ".env"
        if env_path.exists():
            load_dotenv(env_path)

        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.api_base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()
        self.model = os.getenv("OPENAI_MODEL", "gpt-image-1").strip()

    def validate(self) -> None:
        if not self.api_key:
            raise ValueError("请在 .env 文件或环境变量中配置 OPENAI_API_KEY。")

    def get_headers(self) -> dict[str, str]:
        self.validate()
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
