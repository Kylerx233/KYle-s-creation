from pydantic import BaseModel, Field

from app.models.scene import SceneName


class GenerationRequest(BaseModel):
    sketch_data_url: str = Field(..., description="Base64 或 data URL 格式的草图")
    prompt: str = Field(..., description="AI 生成提示词")
    scene: SceneName = Field(default=SceneName.draw)
