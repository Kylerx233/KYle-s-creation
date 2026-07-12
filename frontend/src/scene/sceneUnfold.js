import { SceneBase } from './sceneBase.js';

export const sceneUnfold = {
  name: 'scene-unfold',
  description: '第三幕：画卷展开',
  label: '画卷徐开',
};

export class SceneUnfold extends SceneBase {
  constructor(options) {
    super({ ...options, name: sceneUnfold.name });
    this.definition = sceneUnfold;
    this.appState = options.appState;
    this.progress = 0;
    this.isCompleted = false;
    this.boundNext = () => this.requestNextScene();
  }

  enter() {
    this.progress = 0;
    this.isCompleted = false;
    this.render();
    this.container.querySelector('[data-action="next"]')?.addEventListener('click', this.boundNext);
  }

  exit() {
    this.container.querySelector('[data-action="next"]')?.removeEventListener('click', this.boundNext);
  }

  update(deltaTime) {
    const step = Math.min(0.005, deltaTime / 100000);
    this.progress = Math.min(1, this.progress + step);
    const bar = this.container.querySelector('[data-role="progress"]');
    if (bar) {
      bar.style.width = `${Math.round(this.progress * 100)}%`;
    }
    if (!this.isCompleted && this.progress >= 1) {
      this.isCompleted = true;
      this.requestNextScene();
    }
  }

  render() {
    const generation = this.appState.getLatestGeneration();
    const imageUrl = generation?.image_url || '';
    this.container.innerHTML = `
      <div class="scene-placeholder">
        <div class="scene-card">
          <p class="scene-kicker">${this.definition.label}</p>
          <h1>第三幕 · 画卷徐开</h1>
          <p class="scene-description">${this.definition.description}</p>
          ${imageUrl ? `<img class="scene-preview" src="${imageUrl}" alt="generated" />` : ''}
          <div class="scene-progress">
            <span class="scene-progress-bar" data-role="progress"></span>
          </div>
          <button class="scene-button" data-action="next">跳到下一幕</button>
        </div>
      </div>
    `;
  }
}