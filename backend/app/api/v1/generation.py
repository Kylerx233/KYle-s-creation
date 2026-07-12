from fastapi import APIRouter, Depends

from app.api.deps import get_generation_pipeline
from app.models.request import GenerationRequest
from app.models.response import GenerationResponse
from app.services.generation_pipeline import GenerationPipeline

router = APIRouter()


@router.post("", response_model=GenerationResponse)
def generate_art(
    payload: GenerationRequest,
    pipeline: GenerationPipeline = Depends(get_generation_pipeline),
) -> GenerationResponse:
    result = pipeline.run(payload)
    return GenerationResponse(**result)
