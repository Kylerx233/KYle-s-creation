import { SceneManager } from './scene/sceneManager.js';
import { FrameMonitor } from './systems/performance/frameMonitor.js';
import { Hud } from './ui/hud.js';
import { AppKernel } from './core/appKernel.js';
import { AppState } from './core/appState.js';
import { ApiClient } from './services/apiClient.js';
import { GenerationService } from './services/generationService.js';
import { GestureInputAdapter } from './systems/gesture/gestureInputAdapter.js';
import { APP_EVENTS, SCENE_EVENTS } from './config/constants.js';

const DEBUG_HUD = false;

export class App {
  constructor(rootElement, audioManager = null) {
    this.rootElement = rootElement;
    this.audio = audioManager;
    this.kernel = new AppKernel();
    this.appState = new AppState();
    this.eventBus = this.kernel.eventBus;
    this.ticker = this.kernel.ticker;
    this.apiClient = new ApiClient();
    this.generationService = new GenerationService(this.apiClient);
    this.gestureInputAdapter = new GestureInputAdapter();
    this.frameMonitor = new FrameMonitor();
    this.kernel.systemRegistry.register('frameMonitor', {
      update: (deltaTime) => this.frameMonitor.tick(deltaTime),
    });

    this.sceneManager = new SceneManager({
      rootElement: this.rootElement,
      eventBus: this.eventBus,
      ticker: this.ticker,
      stateMachine: this.kernel.stateMachine,
      generationService: this.generationService,
      appState: this.appState,
      gestureInputAdapter: this.gestureInputAdapter,
    });
    this.hud = new Hud({
      rootElement: this.rootElement,
      sceneManager: this.sceneManager,
      eventBus: this.eventBus,
      frameMonitor: this.frameMonitor,
    });

    this.eventBus.on(APP_EVENTS.GENERATION_COMPLETED, () => {
      this.sceneManager.transition(SCENE_EVENTS.NEXT);
    });

    this.eventBus.on(APP_EVENTS.REQUEST_NEXT_SCENE, () => {
      this.sceneManager.transition(SCENE_EVENTS.NEXT);
    });

    this.eventBus.on('scene:awaken-enter', () => {
      if (this.audio) this.audio.crossfade('mist', 1500);
    });

    this.eventBus.on(APP_EVENTS.REQUEST_RESTART_SCENE, () => {
      this.sceneManager.transition(SCENE_EVENTS.RESTART);
    });
  }

  start() {
    this.sceneManager.start('scene-draw');
    if (DEBUG_HUD) this.hud.mount();
    this.ticker.start((timeDelta) => {
      this.kernel.update(timeDelta);
      this.sceneManager.update(timeDelta);
      if (DEBUG_HUD) this.hud.refresh();
    });
  }
}
