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
            print("[DoubaoService] API key 未配置，使用 mock", flush=True)
            return self._mock_response(payload)

        try:
            result = self._request_remote(payload)
            print("[DoubaoService] 远程调用成功", flush=True)
            return result
        except httpx.HTTPError as exc:
            print(f"[DoubaoService] HTTP 错误: {type(exc).__name__}: {exc}", flush=True)
            return self._mock_response(payload)
        except Exception as exc:
            print(f"[DoubaoService] 未知错误: {type(exc).__name__}: {exc}", flush=True)
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

        # 下载远程图片并转为 base64（浏览器可能无法直接加载 TOS URL）
        image_data_url = self._download_as_data_url(image_url)

        return {
            "image_url": image_data_url,
            "scene": payload.scene.value,
            "message": "ok",
        }

    def _download_as_data_url(self, url: str) -> str:
        """下载远程图片，缩放至 1920×1080，转为 base64"""
        if not url or not url.startswith("http"):
            return url
        try:
            from io import BytesIO
            from PIL import Image

            with httpx.Client(timeout=30.0) as client:
                resp = client.get(url)
                resp.raise_for_status()

            img = Image.open(BytesIO(resp.content))
            # 缩放至 1920×1080（中心裁剪保持比例）
            target_w, target_h = 1920, 1080
            img_ratio = img.width / img.height
            target_ratio = target_w / target_h

            if img_ratio > target_ratio:
                # 图片更宽 → 按高度缩放后裁左右
                new_h = target_h
                new_w = int(img.width * target_h / img.height)
                img = img.resize((new_w, new_h), Image.LANCZOS)
                left = (new_w - target_w) // 2
                img = img.crop((left, 0, left + target_w, target_h))
            else:
                # 图片更高/正方形 → 按宽度缩放后裁上下
                new_w = target_w
                new_h = int(img.height * target_w / img.width)
                img = img.resize((new_w, new_h), Image.LANCZOS)
                top = (new_h - target_h) // 2
                img = img.crop((0, top, target_w, top + target_h))

            buf = BytesIO()
            img.save(buf, format="JPEG", quality=92)
            b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            return f"data:image/jpeg;base64,{b64}"
        except Exception:
            return url

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
        # 降级方案：API 不可用时直接返回用户草图
        return {
            "image_url": payload.sketch_data_url,
            "scene": payload.scene.value,
            "message": "fallback: using sketch as output",
        }
