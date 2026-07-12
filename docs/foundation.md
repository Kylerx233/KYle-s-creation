# Foundation Architecture Baseline

## Frontend Runtime Layers

1. Kernel layer
- appKernel.js: owns EventBus, Ticker, StateMachine, ResourceManager, SystemRegistry
- appState.js: shared runtime state for sketch and generation artifacts across scenes
- stateMachine.js: transition graph with NEXT and RESTART scene events
- systemRegistry.js: update loop integration for reusable systems

2. Scene orchestration layer
- sceneManager.js: scene factory + state-machine-driven transition
- sceneBase.js: lifecycle contract (mount, enter, update, exit, unmount)
- sceneUnfold.js / sceneAwaken.js / sceneGesture.js / sceneShowcase.js: concrete scene classes, no longer placeholder only

3. Feature system layer
- systems/drawing/: brush, ink field, drawing board
- systems/fluid/: lightweight fluid field and renderer
- systems/gesture/: gesture input adapter (mouse fallback, MediaPipe-ready)
- systems/performance/: frame monitor

4. Service layer
- services/apiClient.js: HTTP abstraction
- services/generationService.js: generation endpoint adapter

5. Event contract layer
- constants.js: APP_EVENTS and SCENE_EVENTS as centralized event names
- app.js: listens to scene request events and drives state machine transitions
- sceneDraw -> sceneGenerate now passes real sketchDataUrl through shared appState
- generation result is written to appState and consumed by unfold/showcase scenes

5. UI control layer
- ui/hud.js: runtime controls and scene debugging panel

## Backend Runtime Layers

1. App composition layer
- core/application.py: FastAPI factory and middleware registration
- main.py: entrypoint that exposes app from factory

2. Error handling layer
- core/exceptions.py: value errors and unexpected error handlers

3. API layer
- api/v1/routes.py: v1 router composition
- api/v1/health.py: health endpoint
- api/v1/generation.py: generation endpoint with dependency injection

4. Dependency injection layer
- api/deps.py: singleton service providers via lru_cache

5. Domain model layer
- models/request.py: GenerationRequest
- models/response.py: GenerationResponse
- models/scene.py: SceneName enum

6. Service layer
- services/doubao_service.py: remote call + fallback mock
- services/generation_pipeline.py: orchestration of decode, normalize, storage, job, and generation
- services/storage_service.py / sketch_service.py / job_service.py: extendable service slots

## Validation Baseline

- Frontend build passes with Vite.
- Backend tests pass under backend/tests.
- Root tests pass under tests.

## Next Build Sequence

1. Replace scene placeholders with real scene systems (unfold, awaken, gesture, showcase).
2. Wire drawing output into generation request payload.
3. Add persistence and generated image asset pipeline.
4. Add metrics and performance throttling per scene.
