from __future__ import annotations

import base64
from datetime import datetime

from app.models.request import GenerationRequest
from app.services.doubao_service import DoubaoService
from app.services.job_service import JobService
from app.services.sketch_service import SketchService
from app.services.storage_service import StorageService


class GenerationPipeline:
    def __init__(
        self,
        doubao_service: DoubaoService,
        sketch_service: SketchService,
        storage_service: StorageService,
        job_service: JobService,
    ) -> None:
        self.doubao_service = doubao_service
        self.sketch_service = sketch_service
        self.storage_service = storage_service
        self.job_service = job_service

    def run(self, payload: GenerationRequest) -> dict[str, str]:
        sketch_bytes = self._decode_data_url(payload.sketch_data_url)
        normalized = self.sketch_service.normalize(sketch_bytes)
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        sketch_path = self.storage_service.save_bytes(f"sketch_{timestamp}.png", normalized)
        job = self.job_service.create_job(payload.scene.value)

        generated = self.doubao_service.generate(payload)
        generated["message"] = f"{generated['message']} | job={job['job_id']} | sketch={sketch_path}"
        return generated

    def _decode_data_url(self, data_url: str) -> bytes:
        if "," not in data_url:
            return data_url.encode("utf-8")
        _, encoded = data_url.split(",", maxsplit=1)
        try:
            return base64.b64decode(encoded)
        except ValueError:
            return encoded.encode("utf-8")
