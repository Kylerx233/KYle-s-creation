from app.models.request import GenerationRequest
from app.services.doubao_service import DoubaoService
from app.services.generation_pipeline import GenerationPipeline
from app.services.job_service import JobService
from app.services.sketch_service import SketchService
from app.services.storage_service import StorageService


def test_generation_pipeline_runs_and_returns_scene(tmp_path) -> None:
    pipeline = GenerationPipeline(
        doubao_service=DoubaoService(),
        sketch_service=SketchService(),
        storage_service=StorageService(base_dir=str(tmp_path)),
        job_service=JobService(),
    )

    result = pipeline.run(
        GenerationRequest(
            sketch_data_url='data:image/png;base64,ZmFrZQ==',
            prompt='青绿山水，江河云气',
            scene='scene-generate',
        )
    )

    assert result['scene'] == 'scene-generate'
    assert 'job=' in result['message']
