from functools import lru_cache

from app.services.doubao_service import DoubaoService
from app.services.generation_pipeline import GenerationPipeline
from app.services.job_service import JobService
from app.services.sketch_service import SketchService
from app.services.storage_service import StorageService


@lru_cache(maxsize=1)
def get_doubao_service() -> DoubaoService:
    return DoubaoService()


@lru_cache(maxsize=1)
def get_sketch_service() -> SketchService:
    return SketchService()


@lru_cache(maxsize=1)
def get_storage_service() -> StorageService:
    return StorageService()


@lru_cache(maxsize=1)
def get_job_service() -> JobService:
    return JobService()


@lru_cache(maxsize=1)
def get_generation_pipeline() -> GenerationPipeline:
    return GenerationPipeline(
        doubao_service=get_doubao_service(),
        sketch_service=get_sketch_service(),
        storage_service=get_storage_service(),
        job_service=get_job_service(),
    )
