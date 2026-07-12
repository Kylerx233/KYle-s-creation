from app.models.request import GenerationRequest
from app.services.doubao_service import DoubaoService


def test_generate_returns_mock_response_when_api_key_missing() -> None:
    service = DoubaoService()
    result = service.generate(
        GenerationRequest(
            sketch_data_url="data:image/png;base64,abc123",
            prompt="江山千里，青绿山水",
            scene="scene-generate",
        )
    )

    assert result["scene"] == "scene-generate"
    assert result["message"].startswith("mock generation")
    assert result["image_url"].startswith("data:text/plain;base64,")