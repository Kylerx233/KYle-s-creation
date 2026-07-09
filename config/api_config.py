"""API 配置加载模块。"""

from __future__ import annotations

from pathlib import Path
import os

from dotenv import load_dotenv


class APIConfig:
    """加载 AI 接口配置。"""

    def __init__(
        self,
        api_key: str = "",
        api_base: str = "",
        model: str = "",
    ) -> None:
        root_dir = Path(__file__).resolve().parent.parent
        env_path = root_dir / ".env"
        if env_path.exists():
            load_dotenv(env_path)

        self.api_key = api_key.strip() or os.getenv("DOUBAO_API_KEY", "").strip()
        self.api_base = api_base.strip() or os.getenv("DOUBAO_API_BASE_URL", "https://api.doubao.com/v1").strip()
        self.model = model.strip() or os.getenv("DOUBAO_MODEL", "doubao-image-1").strip()

    def validate(self) -> None:
        if not self.api_key:
            raise ValueError("请在 .env 文件、环境变量或 UI 中配置 DOUBAO_API_KEY。")

    def get_headers(self) -> dict[str, str]:
        self.validate()
        return {
            "Authorization": f"Bearer {self.api_key}",
        }

    def save(self) -> None:
        root_dir = Path(__file__).resolve().parent.parent
        env_path = root_dir / ".env"
        env_lines = [
            f"DOUBAO_API_KEY={self.api_key}",
            f"DOUBAO_API_BASE_URL={self.api_base}",
            f"DOUBAO_MODEL={self.model}",
        ]
        env_path.write_text("\n".join(env_lines) + "\n", encoding="utf-8")
