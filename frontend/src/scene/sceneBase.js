import { APP_EVENTS } from '../config/constants.js';

export class SceneBase {
  constructor({ rootElement, eventBus, ticker, name }) {
    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.ticker = ticker;
    this.name = name;
    this.container = document.createElement('section');
    this.container.className = `scene scene-${name}`;
  }

  mount() {
    this.rootElement.appendChild(this.container);
  }

  unmount() {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  enter() {}

  exit() {}

  update(_deltaTime) {}

  requestNextScene() {
    this.eventBus.emit(APP_EVENTS.REQUEST_NEXT_SCENE);
  }

  requestRestartScene() {
    this.eventBus.emit(APP_EVENTS.REQUEST_RESTART_SCENE);
  }
}