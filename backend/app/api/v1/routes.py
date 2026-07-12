from fastapi import APIRouter

from app.api.v1.generation import router as generation_router
from app.api.v1.health import router as health_router

router = APIRouter()
router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(generation_router, prefix="/generation", tags=["generation"])
