import { SceneBase } from './sceneBase.js';

export const sceneAwaken = {
  name: 'scene-awaken',
  description: '第四幕：山河苏醒',
  label: '山河苏醒',
};

export class SceneAwaken extends SceneBase {
  constructor(options) {
    super({ ...options, name: sceneAwaken.name });
    this.definition = sceneAwaken;
    this.pulse = 0;
    this.boundNext = () => this.requestNextScene();
  }

  enter() {
    this.pulse = 0;
    this.render();
    this.container.querySelector('[data-action="next"]')?.addEventListener('click', this.boundNext);
  }

  exit() {
    this.container.querySelector('[data-action="next"]')?.removeEventListener('click', this.boundNext);
  }

  update(deltaTime) {
    this.pulse += deltaTime;
    const orb = this.container.querySelector('[data-role="orb"]');
    if (orb) {
      const scale = 1 + Math.sin(this.pulse / 350) * 0.08;
      orb.style.transform = `scale(${scale.toFixed(3)})`;
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="scene-placeholder">
        <div class="scene-card">
          <p class="scene-kicker">${this.definition.label}</p>
          <h1>第四幕 · 山河苏醒</h1>
          <p class="scene-description">${this.definition.description}</p>
          <div class="awaken-orb" data-role="orb"></div>
          <button class="scene-button" data-action="next">进入手势交互</button>
        </div>
      </div>
    `;
  }
}