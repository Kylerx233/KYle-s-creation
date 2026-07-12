import { SceneBase } from './sceneBase.js';

export const sceneGesture = {
  name: 'scene-gesture',
  description: '第五幕：手势交互',
  label: '心随指动',
};

export class SceneGesture extends SceneBase {
  constructor(options) {
    super({ ...options, name: sceneGesture.name });
    this.definition = sceneGesture;
    this.appState = options.appState;
    this.gestureInputAdapter = options.gestureInputAdapter;
    this.energy = 0;
    this.disposeInputListener = null;
    this.boundInput = () => {
      this.energy = Math.min(100, this.energy + 5);
    };
    this.boundNext = () => this.requestNextScene();
  }

  enter() {
    this.energy = 0;
    this.render();
    this.gestureInputAdapter.start();
    this.disposeInputListener = this.gestureInputAdapter.onInput(this.boundInput);
    this.container.querySelector('[data-action="next"]')?.addEventListener('click', this.boundNext);
  }

  exit() {
    if (this.disposeInputListener) {
      this.disposeInputListener();
      this.disposeInputListener = null;
    }
    this.gestureInputAdapter.stop();
    this.container.querySelector('[data-action="next"]')?.removeEventListener('click', this.boundNext);
  }

  update() {
    this.energy = Math.max(0, this.energy - 0.6);
    const meter = this.container.querySelector('[data-role="energy"]');
    if (meter) {
      meter.style.width = `${Math.round(this.energy)}%`;
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="scene-placeholder">
        <div class="scene-card">
          <p class="scene-kicker">${this.definition.label}</p>
          <h1>第五幕 · 心随指动</h1>
          <p class="scene-description">移动鼠标模拟手势能量扰动</p>
          <div class="scene-progress">
            <span class="scene-progress-bar" data-role="energy"></span>
          </div>
          <button class="scene-button" data-action="next">进入终章展示</button>
        </div>
      </div>
    `;
  }
}