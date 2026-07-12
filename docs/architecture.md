# Architecture

## Overview

The project uses a split architecture:

- Frontend: H5 / WebGL / Canvas2D / Shader for interactive art scenes
- Backend: FastAPI for AI generation and resource orchestration
- Shared goal: keep the visual layer GPU-friendly and the backend lightweight

## Responsibilities

- Frontend: scene management, drawing, fluid simulation, particles, gestures, audio playback
- Backend: sketch upload, prompt management, Doubao API calls, storage, generation jobs

## Communication

- Frontend sends sketch data and scene events to backend via HTTP
- Backend returns generated image URL or binary result
- Frontend drives scene transitions from the returned generation result
