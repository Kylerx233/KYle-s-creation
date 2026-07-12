import { DEFAULT_SCENE, SCENE_EVENTS, SCENE_SEQUENCE } from '../config/constants.js';
import { EventBus } from './eventBus.js';
import { ResourceManager } from './resourceManager.js';
import { StateMachine } from './stateMachine.js';
import { SystemRegistry } from './systemRegistry.js';
import { Ticker } from './ticker.js';

export class AppKernel {
  constructor() {
    this.eventBus = new EventBus();
    this.ticker = new Ticker();
    this.resourceManager = new ResourceManager();
    this.stateMachine = new StateMachine(DEFAULT_SCENE);
    this.systemRegistry = new SystemRegistry();
    this.configureSceneFlow();
  }

  configureSceneFlow() {
    SCENE_SEQUENCE.forEach((sceneName, index) => {
      const nextScene = SCENE_SEQUENCE[index + 1];
      if (nextScene) {
        this.stateMachine.addTransition(sceneName, SCENE_EVENTS.NEXT, nextScene);
      }
    });

    const lastScene = SCENE_SEQUENCE[SCENE_SEQUENCE.length - 1];
    this.stateMachine.addTransition(lastScene, SCENE_EVENTS.RESTART, DEFAULT_SCENE);
  }

  update(deltaTime) {
    this.systemRegistry.updateAll(deltaTime);
  }
}