from fastapi.testclient import TestClient

from app.main import app


def test_generation_endpoint_returns_payload() -> None:
    client = TestClient(app)
    response = client.post(
        '/api/v1/generation',
        json={
            'sketch_data_url': 'data:image/png;base64,abc123',
            'prompt': '青绿山水，江河云气',
            'scene': 'scene-generate',
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body['scene'] == 'scene-generate'
    assert body['message']
    assert body['image_url']
