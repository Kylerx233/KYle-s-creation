import { SceneBase } from './sceneBase.js';

export const sceneShowcase = {
  name: 'scene-showcase',
  description: '第六幕：作品展示',
  label: '终章展卷',
};

export class SceneShowcase extends SceneBase {
  constructor(options) {
    super({ ...options, name: sceneShowcase.name });
    this.definition = sceneShowcase;
    this.appState = options.appState;
    this.boundRestart = () => this.requestRestartScene();
  }

  enter() {
    this.render();
    this.container.querySelector('[data-action="restart"]')?.addEventListener('click', this.boundRestart);
  }

  exit() {
    this.container.querySelector('[data-action="restart"]')?.removeEventListener('click', this.boundRestart);
  }

  render() {
    const generation = this.appState.getLatestGeneration();
    const imageUrl = generation?.image_url || '';
    const message = generation?.message || '暂无生成记录';
    this.container.innerHTML = `
      <div class="scene-placeholder">
        <div class="scene-card">
          <p class="scene-kicker">${this.definition.label}</p>
          <h1>第六幕 · 终章展卷</h1>
          <p class="scene-description">生成、展开、苏醒与交互已经完成，可重新开始新一轮创作。</p>
          ${imageUrl ? `<img class="scene-preview" src="${imageUrl}" alt="showcase" />` : ''}
          <p class="scene-name">${message}</p>
          <button class="scene-button" data-action="restart">重新开始</button>
        </div>
      </div>
    `;
  }
}