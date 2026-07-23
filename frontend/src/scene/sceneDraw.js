/**
 * Scene 1 — 绘梦起笔
 *
 * 点击"提交草图"后，画板保持不变，雾气从四面向画卷汇聚。
 * 雾气动画在当前场景内播放，不跳转场景。
 * 等 API 返回 + 雾气周期结束后，才过渡到 Scene 2。
 */

import { SceneBase } from './sceneBase.js';
import { DrawingBoard } from '../systems/drawing/drawingBoard.js';

export const sceneDraw = {
  name: 'scene-draw',
  description: '第一幕：用户自由绘制草图',
  label: '绘梦起笔',
};

// ---------------------------------------------------------------------------
// 雾粒子
// ---------------------------------------------------------------------------

class FogParticle {
  constructor(w, h, side) {
    this.w = w; this.h = h; this.side = side;
    this.reset(true);
  }
  reset(init) {
    this.r = 18 + Math.random() * 70;
    this.baseA = 0.04 + Math.random() * 0.22;
    this.x = this.side === 'left'   ? (init ? Math.random() * this.w * 0.45 : -this.r - Math.random() * 70)
           : this.side === 'right'  ? (init ? this.w * 0.55 + Math.random() * this.w * 0.45 : this.w + this.r + Math.random() * 70)
           : this.side === 'top'    ? (init ? Math.random() * this.w : Math.random() * this.w)
           : (init ? Math.random() * this.w : Math.random() * this.w);
    this.y = this.side === 'top'    ? (init ? Math.random() * this.h * 0.4 : -this.r - Math.random() * 40)
           : this.side === 'bottom' ? (init ? this.h * 0.6 + Math.random() * this.h * 0.4 : this.h + this.r + Math.random() * 40)
           : Math.random() * this.h;
    this.dx = this.side === 'left' ? 0.12 : this.side === 'right' ? -0.12 : (Math.random() - 0.5) * 0.15;
    this.dy = this.side === 'top' ? 0.10 : this.side === 'bottom' ? -0.10 : (Math.random() - 0.5) * 0.25;
    this.wA = 0.2 + Math.random() * 0.5;
    this.wF = 0.002 + Math.random() * 0.006;
    this.wO = Math.random() * Math.PI * 2;
    this.life = 350 + Math.random() * 450;
    this.age = init ? Math.random() * this.life : 0;
  }
  tick(speed) {
    this.age += speed;
    const w = Math.sin(this.age * this.wF + this.wO) * this.wA;
    this.x += this.dx * speed + w * 0.3;
    this.y += this.dy * speed + w * 0.3;
    const fi = Math.min(1, this.age / 70);
    const fs = this.life * 0.7;
    const fo = this.age > fs ? 1 - ((this.age - fs) / (this.life - fs)) : 1;
    this.a = this.baseA * fi * Math.max(0, Math.min(1, fo));
    return this.age < this.life && this.a > 0.0005;
  }
  draw(ctx) {
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0, `rgba(248,245,235,${this.a * 1.1})`);
    g.addColorStop(0.4, `rgba(238,232,213,${this.a})`);
    g.addColorStop(0.75, `rgba(210,203,180,${this.a * 0.3})`);
    g.addColorStop(1, 'rgba(188,182,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Scene 1
// ---------------------------------------------------------------------------

export class SceneDraw extends SceneBase {
  constructor(options) {
    super({ ...options, name: sceneDraw.name });
    this.def = sceneDraw;
    this.appState = options.appState;
    this.gestureAdapter = options.gestureInputAdapter;
    this.board = new DrawingBoard({
      container: this.container,
      eventBus: this.eventBus,
      gestureInputAdapter: this.gestureAdapter,
    });

    // OK 手势监听
    this._okDispose = null;
    this._okCooldown = 0;

    // 雾气
    this.fogOn = false;
    this.fogCanvas = null;
    this.fogCtx = null;
    this.fogParticles = [];
    this.fogMax = 50;
    this.fogTime = 0;
    this.fogLevel = 0;
    this.fogTarget = 0;
    this.fogW = 0;
    this.fogH = 0;
    this.transitioned = false;

    this.boundNext = () => this.handleNext();
    this.boundResize = () => this.fogResize();
  }

  // ===== 生命周期 =====

  enter() {
    this.board.mount();
    this.board.enableGestureMode(); // 默认开启手势绘画
    this.renderControls();
    this.renderStatus('伸出食指隔空绘画，比 OK 提交');
    this.container.querySelector('[data-action="next"]')?.addEventListener('click', this.boundNext);

    // 绘画引导
    this._tutorial = document.createElement('div');
    this._tutorial.className = 'tutorial-overlay';
    this._tutorial.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-icon">☝️</div>
        <h2>隔空绘山水</h2>
        <p>伸出 <b>食指</b> 在空中移动即可绘画</p>
        <p>比一个 <b>👌 OK</b> 手势提交草图</p>
        <p class="tutorial-hint">开始绘画后引导自动消失</p>
      </div>`;
    this._tutorial.style.cssText = `
      position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.55);pointer-events:none;transition:opacity .6s;
    `;
    document.body.appendChild(this._tutorial);

    // OK 手势 → 提交草图
    this._okCooldown = 0;
    if (this.gestureAdapter) {
      this._okDispose = this.gestureAdapter.onInput(p => {
        if (p.isOK && this._okCooldown <= 0 && !this.fogOn) {
          this._okCooldown = 2000; // 2 秒冷却防误触
          this.handleNext();
        }
      });
    }
  }

  exit() {
    this.container.querySelector('[data-action="next"]')?.removeEventListener('click', this.boundNext);
    if (this._okDispose) { this._okDispose(); this._okDispose = null; }
    if (this._tutorial) { this._tutorial.remove(); this._tutorial = null; }
    this.board.unmount();
    this.removeFog();
  }

  update(dt) {
    this.board.update(dt);
    if (this.fogOn) this.tickFog(dt);
    if (this._okCooldown > 0) this._okCooldown -= dt;
    // 首次绘画后隐藏引导
    if (this._tutorial && this.board.hasStrokeData()) {
      this._tutorial.style.opacity = '0';
      setTimeout(() => { if(this._tutorial){this._tutorial.remove();this._tutorial=null;} }, 600);
    }
  }

  // ===== 控件 =====

  renderControls() {
    const c = document.createElement('div');
    c.className = 'scene-inline-controls';
    c.innerHTML = `
      <button class="submit-enter-btn" data-action="next">入 画</button>
      <p class="scene-inline-status" data-role="submit-status"></p>`;
    this.container.appendChild(c);
  }

  renderStatus(msg) {
    const el = this.container.querySelector('[data-role="submit-status"]');
    if (el) el.textContent = msg;
  }

  // ===== 提交 → 雾气 → 生成 =====

  handleNext() {
    if (!this.board.hasStrokeData()) {
      this.renderStatus('落墨为约，请先绘一笔。');
      return;
    }

    // 保存草图到全局状态
    const url = this.board.exportDataUrl();
    this.appState.setLatestSketchDataUrl(url);

    // 隐藏提交按钮和状态
    const btn = this.container.querySelector('[data-action="next"]');
    if (btn) btn.style.display = 'none';
    const status = this.container.querySelector('[data-role="submit-status"]');
    if (status) status.style.display = 'none';

    this.renderStatus('墨染山河，万象将生...');

    // 墨迹扩散转场（GPU 加速，缩小 scale 防卡顿）
    const ink = document.createElement('div');
    ink.className = 'ink-diffusion';
    ink.style.willChange = 'transform, opacity';
    document.body.appendChild(ink);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { ink.classList.add('ink-spread'); });
    });

    // 墨迹扩散完成后启动雾气
    setTimeout(() => {
      this.startFog();
      setTimeout(() => { ink.remove(); }, 1200);
    }, 700);
  }

  // ===== 雾气系统 =====

  startFog() {
    this.fogOn = true;
    this.fogTime = 0;
    this.fogLevel = 0;
    this.fogTarget = 0.96;
    this.transitioned = false;

    // 创建雾气 canvas
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.className = 'fog-overlay';
    this.fogCtx = this.fogCanvas.getContext('2d');
    this.container.appendChild(this.fogCanvas);
    this.fogResize();

    // 预填充粒子
    this.fogParticles = [];
    for (let i = 0; i < this.fogMax; i++) {
      const side = ['left', 'right', 'top', 'bottom'][Math.floor(Math.random() * 4)];
      this.fogParticles.push(new FogParticle(this.fogW, this.fogH, side));
    }

    window.addEventListener('resize', this.boundResize);
  }

  removeFog() {
    this.fogOn = false;
    window.removeEventListener('resize', this.boundResize);
    if (this.fogCanvas) { this.fogCanvas.remove(); this.fogCanvas = null; this.fogCtx = null; }
    this.fogParticles = [];
  }

  fogResize() {
    if (!this.fogCanvas) return;
    this.fogW = this.container.clientWidth || window.innerWidth;
    this.fogH = this.container.clientHeight || window.innerHeight;
    this.fogCanvas.width = this.fogW;
    this.fogCanvas.height = this.fogH;
  }

  tickFog(dt) {
    this.fogTime += dt;

    // 雾浓度向目标平滑逼近（加速）
    const diff = this.fogTarget - this.fogLevel;
    this.fogLevel += diff * (1 - Math.exp(-3.0 * dt / 1000));

    // 雾够浓就立刻切到 Scene 2（API 在 Scene 2 里调）
    if (!this.transitioned && this.fogLevel > 0.85) {
      this.transitioned = true;
      this.removeFog();
      this.requestNextScene();
      return;
    }

    // 更新粒子
    const speed = this.fogLevel < 0.5 ? 1.0 : 1.5;
    while (this.fogParticles.length < this.fogMax) {
      const side = ['left', 'right', 'top', 'bottom'][Math.floor(Math.random() * 4)];
      this.fogParticles.push(new FogParticle(this.fogW, this.fogH, side));
    }
    this.fogParticles = this.fogParticles.filter(p => p.tick(speed));

    this.drawFog();
  }

  drawFog() {
    const C = this.fogCtx;
    const W = this.fogW, H = this.fogH;
    C.clearRect(0, 0, W, H);

    const I = this.fogLevel;
    if (I < 0.01) return;

    // ----- 粒子 -----
    for (const p of this.fogParticles) p.draw(C);

    // ----- 四边雾幕 -----
    const cw = Math.min(W * 0.48, W * (0.02 + I * 0.46));

    // 左侧
    if (cw > 2) {
      const gl = C.createLinearGradient(0, 0, cw, 0);
      gl.addColorStop(0, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
      gl.addColorStop(0.75, `rgba(245,241,228,${Math.min(1, I * 0.9)})`);
      gl.addColorStop(0.9, `rgba(245,241,228,${I * 0.35})`);
      gl.addColorStop(1, 'rgba(245,241,228,0)');
      C.fillStyle = gl; C.fillRect(0, 0, cw, H);
    }
    // 右侧
    if (cw > 2) {
      const gr = C.createLinearGradient(W - cw, 0, W, 0);
      gr.addColorStop(0, 'rgba(245,241,228,0)');
      gr.addColorStop(0.1, `rgba(245,241,228,${I * 0.35})`);
      gr.addColorStop(0.25, `rgba(245,241,228,${Math.min(1, I * 0.9)})`);
      gr.addColorStop(1, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
      C.fillStyle = gr; C.fillRect(W - cw, 0, cw, H);
    }
    // 顶部
    const ch = Math.min(H * 0.48, H * (0.02 + I * 0.46));
    if (ch > 2) {
      const gt = C.createLinearGradient(0, 0, 0, ch);
      gt.addColorStop(0, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
      gt.addColorStop(0.8, `rgba(245,241,228,${I * 0.35})`);
      gt.addColorStop(1, 'rgba(245,241,228,0)');
      C.fillStyle = gt; C.fillRect(0, 0, W, ch);
    }
    // 底部
    if (ch > 2) {
      const gb = C.createLinearGradient(0, H - ch, 0, H);
      gb.addColorStop(0, 'rgba(245,241,228,0)');
      gb.addColorStop(0.2, `rgba(245,241,228,${I * 0.35})`);
      gb.addColorStop(1, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
      C.fillStyle = gb; C.fillRect(0, H - ch, W, ch);
    }

    // ----- 中心雾纱：雾浅时朦胧，雾浓时完全遮蔽 -----
    if (I > 0.25) {
      // 雾越浓越不透明，I=0.9 时几乎完全遮住 Scene 1
      const centerAlpha = I < 0.6
        ? (I - 0.25) * 0.3
        : 0.1 + (I - 0.6) * 2.0;  // 0.6→0.1, 0.9→0.7, 0.96→0.82
      C.fillStyle = `rgba(245,241,228,${Math.min(0.92, centerAlpha)})`;
      C.fillRect(0, 0, W, H);
    }
  }

}
