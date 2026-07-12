# Release Guide

## Local Verification

Run full verification before release:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
```

This script runs:

1. Backend tests (`backend`)
2. Root tests (`tests`)
3. Frontend dependency install
4. Frontend production build

## CI Verification

GitHub Actions workflow:

- `.github/workflows/ci.yml`

Checks on push and pull request:

1. Python backend tests
2. Root tests
3. Frontend build

## Manual Runtime Check

Optional frontend env config:

```text
frontend/.env
VITE_API_BASE_URL=/api/v1
```

1. Start backend

```powershell
cd backend
uvicorn app.main:app --reload
```

2. Start frontend

```powershell
cd frontend
npm run dev
```

3. Verify scene flow:

- Draw scene can export sketch and enter generate scene.
- Generate scene can call backend endpoint.
- Unfold and Showcase scenes can read generated result from shared app state.
