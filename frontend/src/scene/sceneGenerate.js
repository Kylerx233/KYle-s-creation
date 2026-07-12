import { SceneBase } from './sceneBase.js';
import { APP_EVENTS } from '../config/constants.js';

export const sceneGenerate = {
  name: 'scene-generate',
  description: '第二幕：提交草图并等待 AI 生成',
  label: '墨生山河',
};

export class SceneGenerate extends SceneBase {
  constructor(options) {
    super({ ...options, name: sceneGenerate.name });
    this.definition = sceneGenerate;
    this.appState = options.appState;
    this.generationService = options.generationService;
    this.isRunning = false;
    this.boundGenerate = () => this.runGeneration();
  }

  enter() {
    this.render();
    this.container.querySelector('[data-action="generate"]')?.addEventListener('click', this.boundGenerate);
  }

  exit() {
    this.container.querySelector('[data-action="generate"]')?.removeEventListener('click', this.boundGenerate);
  }

  render(status = '待命') {
    const hasSketch = Boolean(this.appState.getLatestSketchDataUrl());
    this.container.innerHTML = `
      <div class="scene-placeholder">
        <div class="scene-card">
          <p class="scene-kicker">${this.definition.label}</p>
          <h1>第二幕 · 墨生山河</h1>
          <p class="scene-description">${this.definition.description}</p>
          <p class="scene-name">状态：${status}</p>
          <p class="scene-name">草图输入：${hasSketch ? '已就绪' : '未检测到（将使用占位）'}</p>
          <button class="scene-button" data-action="generate">启动生成</button>
        </div>
      </div>
    `;
  }

  async runGeneration() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.render('生成中');

    try {
      const sketchDataUrl = this.appState.getLatestSketchDataUrl() || 'data:image/png;base64,placeholder';
      const result = await this.generationService.generate({
        sketchDataUrl,
        prompt: '青绿山水，云气流动，绢本质感',
        scene: sceneGenerate.name,
      });
      this.appState.setLatestGeneration(result);
      this.eventBus.emit(APP_EVENTS.GENERATION_COMPLETED, result);
      this.render('生成完成');
    } catch (_error) {
      this.render('生成失败');
    } finally {
      this.isRunning = false;
      this.container.querySelector('[data-action="generate"]')?.addEventListener('click', this.boundGenerate);
    }
  }
}