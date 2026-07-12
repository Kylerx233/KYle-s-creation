import { Brush } from './brush.js';
import { InkField } from './inkField.js';
import { FluidField } from '../fluid/fluidField.js';
import { FluidRenderer } from '../fluid/fluidRenderer.js';

export class DrawingBoard {
  constructor({ container, eventBus, gestureInputAdapter = null }) {
    this.container = container;
    this.eventBus = eventBus;
    this.gestureInputAdapter = gestureInputAdapter;
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'drawing-board';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'drawing-canvas';
    this.inkCanvas = document.createElement('canvas');
    this.inkCanvas.className = 'ink-canvas';
    this.fluidCanvas = document.createElement('canvas');
    this.fluidCanvas.className = 'fluid-canvas';
    this.overlay = document.createElement('div');
    this.overlay.className = 'drawing-overlay';
    this.context = this.canvas.getContext('2d', { alpha: true });
    this.inkContext = this.inkCanvas.getContext('2d', { alpha: true });
    this.fluidContext = this.fluidCanvas.getContext('2d', { alpha: true });
    this.isDrawing = false;
    this.lastPoint = null;
    this.brush = new Brush();
    this.strokes = [];
    this.activeStroke = null;
    this.gestureEnabled = false;
    this.gestureDrawing = false;
    this.lastGesturePoint = null;
    this.disposeGestureListener = null;
    this.inkField = null;
    this.inkRenderInterval = 33;
    this.inkAccumulator = 0;
    this.inkDirty = false;
    this.inkResolutionScale = 0.4;
    this.fluidField = null;
    this.fluidRenderer = null;
    this.maxHistory = 120;
    this.boundResize = () => this.resize();
    this.boundPointerDown = (event) => this.handlePointerDown(event);
    this.boundPointerMove = (event) => this.handlePointerMove(event);
    this.boundPointerUp = () => this.handlePointerUp();
    this.boundUndo = () => this.undo();
    this.boundClear = () => this.clear();
    this.boundSizeChange = (event) => {
      const value = Number(event.target.value);
      this.brush.setSize(value);
      this.syncToolValue('size', String(value));
    };
    this.boundInkChange = (event) => {
      const value = Number(event.target.value);
      this.brush.setInkLoad(value / 100);
      this.syncToolValue('ink', String(Math.round(value)));
    };
    this.boundGestureToggle = () => {
      this.toggleGestureMode();
    };
  }

  mount() {
    this.wrapper.innerHTML = `
      <div class="drawing-header">
        <div class="drawing-title">第一幕 · 绘梦起笔</div>
        <div class="drawing-hint">拖动落笔，速度与压力会影响墨迹粗细与浓淡</div>
      </div>
      <div class="drawing-tools">
        <label>
          笔锋
          <input type="range" min="6" max="56" step="1" value="22" data-role="brush-size" />
          <span data-role="size">22</span>
        </label>
        <label>
          墨量
          <input type="range" min="15" max="100" step="1" value="70" data-role="ink-load" />
          <span data-role="ink">70</span>
        </label>
        <button class="scene-button drawing-tool-button" data-action="undo">撤销</button>
        <button class="scene-button drawing-tool-button" data-action="clear">清空</button>
        <button class="scene-button drawing-tool-button" data-action="gesture-toggle">手势模式：关</button>
      </div>
    `;
    this.wrapper.appendChild(this.fluidCanvas);
    this.wrapper.appendChild(this.inkCanvas);
    this.wrapper.appendChild(this.canvas);
    this.wrapper.appendChild(this.overlay);
    this.container.appendChild(this.wrapper);
    this.resize();
    window.addEventListener('resize', this.boundResize);
    this.canvas.addEventListener('pointerdown', this.boundPointerDown);
    this.canvas.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);

    this.wrapper.querySelector('[data-action="undo"]')?.addEventListener('click', this.boundUndo);
    this.wrapper.querySelector('[data-action="clear"]')?.addEventListener('click', this.boundClear);
    this.wrapper.querySelector('[data-action="gesture-toggle"]')?.addEventListener('click', this.boundGestureToggle);
    this.wrapper.querySelector('[data-role="brush-size"]')?.addEventListener('input', this.boundSizeChange);
    this.wrapper.querySelector('[data-role="ink-load"]')?.addEventListener('input', this.boundInkChange);
    this.renderEmpty();
  }

  unmount() {
    window.removeEventListener('resize', this.boundResize);
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    this.canvas.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.wrapper.querySelector('[data-action="undo"]')?.removeEventListener('click', this.boundUndo);
    this.wrapper.querySelector('[data-action="clear"]')?.removeEventListener('click', this.boundClear);
    this.wrapper.querySelector('[data-action="gesture-toggle"]')?.removeEventListener('click', this.boundGestureToggle);
    this.wrapper.querySelector('[data-role="brush-size"]')?.removeEventListener('input', this.boundSizeChange);
    this.wrapper.querySelector('[data-role="ink-load"]')?.removeEventListener('input', this.boundInkChange);
    this.disableGestureMode();
    this.wrapper.remove();
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.fluidCanvas.width = width;
    this.fluidCanvas.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    const inkWidth = Math.max(320, Math.floor(width * this.inkResolutionScale));
    const inkHeight = Math.max(180, Math.floor(height * this.inkResolutionScale));
    this.inkCanvas.width = inkWidth;
    this.inkCanvas.height = inkHeight;
    this.inkField = new InkField(inkWidth, inkHeight);
    this.fluidField = new FluidField(width, height, 28);
    this.fluidRenderer = new FluidRenderer(this.fluidContext, this.fluidField);
    this.rebuildFromHistory();
  }

  renderEmpty() {
    if (!this.context) {
      return;
    }
    const { width, height } = this.canvas;
    this.context.clearRect(0, 0, width, height);
    const gradient = this.context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f7f0df');
    gradient.addColorStop(1, '#ead9b4');
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, width, height);
  }

  handlePointerDown(event) {
    event.preventDefault();
    this.isDrawing = true;
    this.lastPoint = this.getPoint(event);
    this.activeStroke = {
      points: [this.lastPoint],
      brushSize: this.brush.size,
      inkLoad: this.brush.inkLoad,
    };
    this.canvas.setPointerCapture?.(event.pointerId);
  }

  handlePointerMove(event) {
    if (!this.isDrawing || !this.lastPoint) {
      return;
    }
    const point = this.getPoint(event);
    const pressure = event.pressure && event.pressure > 0 ? event.pressure : 0.55;
    this.drawSegment(this.lastPoint, point, pressure);
    this.activeStroke.points.push(point);
    this.lastPoint = point;
  }

  handlePointerUp() {
    this.isDrawing = false;
    this.lastPoint = null;
    this.finalizeActiveStroke();
  }

  finalizeActiveStroke() {
    if (this.activeStroke && this.activeStroke.points.length > 1) {
      this.strokes.push(this.activeStroke);
      if (this.strokes.length > this.maxHistory) {
        this.strokes.shift();
      }
    }
    this.activeStroke = null;
  }

  drawSegment(fromPoint, toPoint, pressure = 0.55, customBrush = null) {
    if (!this.context) {
      return;
    }

    const brush = customBrush || this.brush;
    const strokeInfo = brush.drawStroke(this.context, fromPoint, toPoint, { pressure });
    this.injectInkAlongPath(fromPoint, toPoint, strokeInfo.width * 0.55, strokeInfo.intensity);

    this.injectFluidAlongPath(fromPoint, toPoint, pressure);
    this.inkDirty = true;
    this.eventBus.emit('drawing:stroke', { fromPoint, toPoint });
  }

  injectFluidAlongPath(fromPoint, toPoint, pressure = 0.55) {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const distance = Math.hypot(dx, dy);
    const segments = Math.max(1, Math.ceil(distance / 6));
    const densityAmount = 0.045 + pressure * 0.08;
    const velocityScale = 0.18;

    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const x = fromPoint.x + dx * t;
      const y = fromPoint.y + dy * t;
      this.fluidField.addDensity(x, y, densityAmount);
      this.fluidField.addVelocity(x, y, dx * velocityScale, dy * velocityScale);
    }
  }

  injectInkAlongPath(fromPoint, toPoint, radius, intensity) {
    const scaleX = this.inkField.width / this.canvas.width;
    const scaleY = this.inkField.height / this.canvas.height;
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.max(1, Math.floor(radius * 0.6));
    const segments = Math.max(1, Math.ceil(distance / step));
    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const x = (fromPoint.x + dx * t) * scaleX;
      const y = (fromPoint.y + dy * t) * scaleY;
      const scaledRadius = Math.max(1.2, radius * 0.5 * (scaleX + scaleY));
      this.inkField.inject(x, y, scaledRadius, intensity);
    }
  }

  renderInkField() {
    if (!this.inkContext || !this.inkField) {
      return;
    }
    const imageData = this.inkField.toImageData();
    this.inkContext.putImageData(imageData, 0, 0);
    this.inkDirty = false;
  }

  getPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  update(deltaTime = 16) {
    if (this.inkField) {
      this.inkField.update(0.0011, 0.11);
      this.inkAccumulator += deltaTime;
      if (this.inkDirty && this.inkAccumulator >= this.inkRenderInterval) {
        this.renderInkField();
        this.inkAccumulator = 0;
      }
    }
    if (this.fluidField && this.fluidRenderer) {
      this.fluidField.update();
      this.fluidContext.clearRect(0, 0, this.fluidCanvas.width, this.fluidCanvas.height);
      this.fluidRenderer.render();
    }
  }

  exportDataUrl() {
    return this.canvas.toDataURL('image/png');
  }

  toggleGestureMode() {
    if (!this.gestureInputAdapter) {
      return;
    }
    if (this.gestureEnabled) {
      this.disableGestureMode();
      this.updateGestureToggleText();
      return;
    }
    this.enableGestureMode();
    this.updateGestureToggleText();
  }

  enableGestureMode() {
    if (!this.gestureInputAdapter || this.gestureEnabled) {
      return;
    }
    this.gestureEnabled = true;
    this.gestureInputAdapter.start();
    this.disposeGestureListener = this.gestureInputAdapter.onInput((payload) => this.handleGestureInput(payload));
  }

  disableGestureMode() {
    if (!this.gestureEnabled) {
      return;
    }
    this.gestureEnabled = false;
    this.gestureDrawing = false;
    this.lastGesturePoint = null;
    this.finalizeActiveStroke();
    if (this.disposeGestureListener) {
      this.disposeGestureListener();
      this.disposeGestureListener = null;
    }
    this.gestureInputAdapter?.stop();
  }

  updateGestureToggleText() {
    const button = this.wrapper.querySelector('[data-action="gesture-toggle"]');
    if (button) {
      button.textContent = `手势模式：${this.gestureEnabled ? '开' : '关'}`;
    }
  }

  handleGestureInput(payload) {
    if (!this.gestureEnabled || payload.type !== 'hand') {
      return;
    }

    const point = {
      x: Math.max(0, Math.min(this.canvas.width, payload.x)),
      y: Math.max(0, Math.min(this.canvas.height, payload.y)),
    };

    if (payload.isDrawing) {
      if (!this.gestureDrawing) {
        this.gestureDrawing = true;
        this.lastGesturePoint = point;
        this.activeStroke = {
          points: [point],
          brushSize: this.brush.size,
          inkLoad: this.brush.inkLoad,
        };
        return;
      }

      if (this.lastGesturePoint) {
        this.drawSegment(this.lastGesturePoint, point, 0.62);
      }
      this.activeStroke?.points.push(point);
      this.lastGesturePoint = point;
      return;
    }

    if (this.gestureDrawing) {
      this.gestureDrawing = false;
      this.lastGesturePoint = null;
      this.finalizeActiveStroke();
    }
  }

  hasStrokeData() {
    return this.strokes.length > 0 || (this.activeStroke?.points.length || 0) > 1;
  }

  clear() {
    this.strokes = [];
    this.activeStroke = null;
    this.inkField?.clear();
    this.inkContext?.clearRect(0, 0, this.inkCanvas.width, this.inkCanvas.height);
    this.fluidField?.clear();
    this.renderEmpty();
    this.inkDirty = false;
  }

  undo() {
    if (this.strokes.length === 0) {
      return;
    }
    this.strokes.pop();
    this.rebuildFromHistory();
  }

  rebuildFromHistory() {
    this.renderEmpty();
    this.inkField?.clear();
    this.fluidField?.clear();

    for (const stroke of this.strokes) {
      const replayBrush = new Brush({ size: stroke.brushSize, inkLoad: stroke.inkLoad });
      for (let index = 1; index < stroke.points.length; index += 1) {
        this.drawSegment(stroke.points[index - 1], stroke.points[index], 0.55, replayBrush);
      }
    }
    this.renderInkField();
  }

  syncToolValue(name, value) {
    this.wrapper.querySelector(`[data-role="${name}"]`)?.replaceChildren(document.createTextNode(value));
  }
}
