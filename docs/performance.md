# Performance

## Targets

- 60 FPS target on desktop browsers
- No heavy per-frame allocations
- No repeated image loading
- GPU-first rendering for fluid and particle effects

## Constraints

- Keep particle count bounded
- Reduce fluid resolution on lower-end devices
- Use requestAnimationFrame for all animation loops
- Cache textures, brushes, and scene resources
