# API

## Endpoints

- GET /api/v1/health
- POST /api/v1/generation

## Generation Request

- `sketch_data_url`: base64 or data URL sketch
- `prompt`: AI generation prompt
- `scene`: current scene name

## Generation Response

- `image_url`: generated image
- `scene`: response scene label
- `message`: status message
