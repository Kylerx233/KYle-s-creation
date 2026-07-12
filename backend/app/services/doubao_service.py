from __future__ import annotations

import base64
from typing import Any

import httpx

from app.core.config import settings
from app.models.request import GenerationRequest


class DoubaoService:
    def generate(self, payload: GenerationRequest) -> dict[str, str]:
        if not payload.sketch_data_url:
            raise ValueError("sketch_data_url 不能为空")
        if not payload.prompt:
            raise ValueError("prompt 不能为空")

        if not settings.doubao_api_key:
            return self._mock_response(payload)

        try:
            return self._request_remote(payload)
        except httpx.HTTPError:
            return self._mock_response(payload)

    def _request_remote(self, payload: GenerationRequest) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {settings.doubao_api_key}",
            "Content-Type": "application/json",
        }
        body: dict[str, Any] = {
            "model": settings.doubao_model,
            "prompt": payload.prompt,
            "image": payload.sketch_data_url,
        }
        with httpx.Client(timeout=60.0) as client:
            response = client.post(settings.doubao_api_base_url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()

        image_url = self._extract_image_url(data)
        return {
            "image_url": image_url,
            "scene": payload.scene.value,
            "message": "ok",
        }

    def _extract_image_url(self, data: dict[str, Any]) -> str:
        for key in ("image_url", "url"):
            value = data.get(key)
            if isinstance(value, str) and value:
                return value

        if isinstance(data.get("data"), list):
            for item in data["data"]:
                if isinstance(item, dict):
                    for key in ("image_url", "url"):
                        value = item.get(key)
                        if isinstance(value, str) and value:
                            return value
        return ""

    def _mock_response(self, payload: GenerationRequest) -> dict[str, str]:
        preview = payload.sketch_data_url[:48]
        return {
            "image_url": f"data:text/plain;base64,{base64.b64encode(preview.encode('utf-8')).decode('ascii')}",
            "scene": payload.scene.value,
            "message": f"mock generation using {settings.doubao_model}",
        }
