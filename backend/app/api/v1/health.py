from fastapi import APIRouter
import httpx

from app.core.config import settings

router = APIRouter()


@router.get("")
def health_check() -> dict[str, str]:
    # 测试豆包 API 连通性
    api_status = "unknown"
    if not settings.doubao_api_key:
        api_status = "no_key"
    else:
        try:
            r = httpx.post(
                settings.doubao_api_base_url,
                headers={"Authorization": f"Bearer {settings.doubao_api_key}", "Content-Type": "application/json"},
                json={"model": settings.doubao_model, "prompt": "test", "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNkYPj/n4EwEIwBqhgHABXfAgkM1eHZAAAAAElFTkSuQmCC"},
                timeout=10.0,
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
