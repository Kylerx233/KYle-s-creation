from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "JiangShanQianLi Backend"
    version: str = "0.1.0"
    allow_origins: list[str] = ["*"]
    doubao_api_key: str = ""
    doubao_api_base_url: str = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
    doubao_model: str = "doubao-seedream-5-0-260128"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
