import { SCENE_EVENTS, SCENE_SEQUENCE } from '../config/constants.js';

export class Hud {
  constructor({ rootElement, sceneManager, eventBus, frameMonitor }) {
    this.rootElement = rootElement;
    this.sceneManager = sceneManager;
    this.eventBus = eventBus;
    this.frameMonitor = frameMonitor;
    this.element = document.createElement('aside');
    this.element.className = 'hud';
  }

  mount() {
    this.rootElement.appendChild(this.element);
    this.render();
  }

  render() {
    this.element.innerHTML = `
      <div class="hud-panel">
        <div class="hud-title">江山千里</div>
        <div class="hud-fps">FPS: <span data-role="fps">--</span></div>
        <div class="hud-current">Scene: <span data-role="scene">${this.sceneManager.getCurrentSceneName()}</span></div>
        <div class="hud-actions">
          ${SCENE_SEQUENCE.map((sceneName) => `<button data-scene="${sceneName}">${sceneName}</button>`).join('')}
        </div>
        <div class="hud-transitions">
          <button data-action="next">下一幕</button>
          <button data-action="restart">重启</button>
        </div>
      </div>
    `;

    this.element.querySelectorAll('button[data-scene]').forEach((button) => {
      button.addEventListener('click', () => {
        const sceneName = button.getAttribute('data-scene');
        if (sceneName) {
          this.sceneManager.start(sceneName);
          this.refresh();
        }
      });
    });

    this.element.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      this.sceneManager.transition(SCENE_EVENTS.NEXT);
      this.refresh();
    });

    this.element.querySelector('[data-action="restart"]')?.addEventListener('click', () => {
      this.sceneManager.transition(SCENE_EVENTS.RESTART);
      this.refresh();
    });
  }

  refresh() {
    const fpsElement = this.element.querySelector('[data-role="fps"]');
    const sceneElement = this.element.querySelector('[data-role="scene"]');
    if (fpsElement) {
      fpsElement.textContent = String(this.frameMonitor.fps || 0);
    }
    if (sceneElement) {
      sceneElement.textContent = this.sceneManager.getCurrentSceneName();
    }
  }

  unmount() {
    this.element.remove();
  }
}