from pydantic import BaseModel

from app.models.scene import SceneName


class GenerationResponse(BaseModel):
    image_url: str
    scene: SceneName = SceneName.generate
    message: str = "ok"
