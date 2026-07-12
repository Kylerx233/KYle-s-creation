from app.core.application import create_app
from fastapi.testclient import TestClient


def test_create_app_contains_api_router() -> None:
    application = create_app()
    client = TestClient(application)
    health_response = client.get('/api/v1/health')
    generation_response = client.post(
        '/api/v1/generation',
        json={
            'sketch_data_url': 'data:image/png;base64,abc123',
            'prompt': '青绿山水，江河云气',
            'scene': 'scene-generate',
        },
    )

    assert health_response.status_code == 200
    assert generation_response.status_code == 200
