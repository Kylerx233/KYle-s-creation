import { DEFAULT_SCENE } from '../config/constants.js';
import { sceneDraw, SceneDraw } from './sceneDraw.js';
import { sceneGenerate, SceneGenerate } from './sceneGenerate.js';
import { sceneUnfold, SceneUnfold } from './sceneUnfold.js';
import { sceneAwaken, SceneAwaken } from './sceneAwaken.js';
import { sceneGesture, SceneGesture } from './sceneGesture.js';
import { sceneShowcase, SceneShowcase } from './sceneShowcase.js';

export class SceneManager {
  constructor({ rootElement, eventBus, ticker, stateMachine, generationService, appState, gestureInputAdapter }) {
    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.ticker = ticker;
    this.stateMachine = stateMachine;
    this.generationService = generationService;
    this.appState = appState;
    this.gestureInputAdapter = gestureInputAdapter;
    this.scenes = new Map();
    this.currentScene = null;
  }

  createScene(sceneName) {
    let scene;
    if (sceneName === sceneDraw.name) {
      scene = new SceneDraw({
        rootElement: this.rootElement,
        eventBus: this.eventBus,
        ticker: this.ticker,
        appState: this.appState,
        gestureInputAdapter: this.gestureInputAdapter,
      });
    } else if (sceneName === sceneGenerate.name) {
      scene = new SceneGenerate({
        rootElement: this.rootElement,
        eventBus: this.eventBus,
        ticker: this.ticker,
        generationService: this.generationService,
        appState: this.appState,
      });
    } else if (sceneName === sceneUnfold.name) {
      scene = new SceneUnfold({
        rootElement: this.rootElement,
        eventBus: this.eventBus,
        ticker: this.ticker,
        appState: this.appState,
      });
    } else if (sceneName === sceneAwaken.name) {
      scene = new SceneAwaken({
        rootElement: this.rootElement,
        eventBus: this.eventBus,
        ticker: this.ticker,
        appState: this.appState,
      });
    } else if (sceneName === sceneGesture.name) {
      scene = new SceneGesture({
        rootElement: this.rootElement,
        eventBus: this.eventBus,
        ticker: this.ticker,
        appState: this.appState,
        gestureInputAdapter: this.gestureInputAdapter,
      });
    } else if (sceneName === sceneShowcase.name) {
      scene = new SceneShowcase({
        rootElement: this.rootElement,
        eventBus: this.eventBus,
        ticker: this.ticker,
        appState: this.appState,
      });
    } else {
      scene = new SceneDraw({
        rootElement: this.rootElement,
        eventBus: this.eventBus,
        ticker: this.ticker,
        appState: this.appState,
        gestureInputAdapter: this.gestureInputAdapter,
      });
    }

    this.scenes.set(sceneName, scene);
    return scene;
  }

  start(sceneName = DEFAULT_SCENE) {
    const targetScene = this.scenes.get(sceneName) || this.createScene(sceneName);
    this.stateMachine.setState(sceneName);
    if (this.currentScene) {
      this.currentScene.exit();
      this.currentScene.unmount();
    }
    this.currentScene = targetScene;
    this.currentScene.mount();
    this.currentScene.enter();
    return this.currentScene;
  }

  transition(eventName) {
    if (!this.stateMachine.canTransition(eventName)) {
      return this.currentScene;
    }
    const nextScene = this.stateMachine.transition(eventName);
    return this.start(nextScene);
  }

  update(deltaTime) {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  getCurrentSceneName() {
    return this.stateMachine.getState();
  }
}