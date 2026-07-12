import { SceneBase } from './sceneBase.js';
import { DrawingBoard } from '../systems/drawing/drawingBoard.js';

export const sceneDraw = {
  name: 'scene-draw',
  description: '第一幕：用户自由绘制草图',
  label: '绘梦起笔',
};

export class SceneDraw extends SceneBase {
  constructor(options) {
    super({ ...options, name: sceneDraw.name });
    this.definition = sceneDraw;
    this.appState = options.appState;
    this.board = new DrawingBoard({
      container: this.container,
      eventBus: this.eventBus,
      gestureInputAdapter: options.gestureInputAdapter,
    });
    this.boundNext = () => this.handleNext();
  }

  enter() {
    this.board.mount();
    this.renderControls();
    this.renderStatus('请先进行绘制，再提交草图');
    this.container.querySelector('[data-action="next"]')?.addEventListener('click', this.boundNext);
  }

  exit() {
    this.container.querySelector('[data-action="next"]')?.removeEventListener('click', this.boundNext);
    this.board.unmount();
  }

  update(deltaTime) {
    this.board.update(deltaTime);
  }

  renderControls() {
    const controls = document.createElement('div');
    controls.className = 'scene-inline-controls';
    controls.innerHTML = `
      <button class="scene-button" data-action="next">提交草图并进入生成</button>
      <p class="scene-inline-status" data-role="submit-status"></p>
    `;
    this.container.appendChild(controls);
  }

  renderStatus(message) {
    const statusElement = this.container.querySelector('[data-role="submit-status"]');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  handleNext() {
    if (!this.board.hasStrokeData()) {
      this.renderStatus('当前画布为空，请先落笔。');
      return;
    }
    const sketchDataUrl = this.board.exportDataUrl();
    this.appState.setLatestSketchDataUrl(sketchDataUrl);
    this.renderStatus('草图已提交，正在进入生成幕。');
    this.requestNextScene();
  }
}