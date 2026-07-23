from fastapi import APIRouter
import httpx
import base64
from io import BytesIO
from PIL import Image

from app.core.config import settings

router = APIRouter()


def _make_test_png() -> str:
    """生成一张 32×32 的有效 PNG 作为 API 测试图"""
    img = Image.new("RGB", (32, 32), color=(128, 128, 128))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@router.get("")
def health_check() -> dict[str, str]:
    api_status = "unknown"
    if not settings.doubao_api_key:
        api_status = "no_key"
    else:
        try:
            r = httpx.post(
                settings.doubao_api_base_url,
                headers={"Authorization": f"Bearer {settings.doubao_api_key}", "Content-Type": "application/json"},
                json={"model": settings.doubao_model, "prompt": "test", "image": _make_test_png()},
                timeout=5.0,
            )
            api_status = f"http_{r.status_code}"
        except Exception as e:
            api_status = f"error_{type(e).__name__}"

    return {
        "status": "ok",
        "key_set": str(bool(settings.doubao_api_key)),
        "key_len": str(len(settings.doubao_api_key)),
        "api_test": api_status,
    }
