export const APP_NAME = '江山千里——绘梦成型';
export const DEFAULT_SCENE = 'scene-draw';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const SCENE_SEQUENCE = [
  'scene-draw',
  'scene-generate',
  'scene-unfold',
  'scene-awaken',
];
export const SCENE_EVENTS = {
  NEXT: 'NEXT_SCENE',
  RESTART: 'RESTART_SCENE',
};
export const APP_EVENTS = {
  REQUEST_NEXT_SCENE: 'scene:request-next',
  REQUEST_RESTART_SCENE: 'scene:request-restart',
  GENERATION_COMPLETED: 'generation:completed',
};
export const PERFORMANCE_BUDGET = {
  targetFps: 60,
  fluidResolution: 128,
  maxParticles: 2000,
};