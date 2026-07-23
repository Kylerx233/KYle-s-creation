/**
 * Scene 2 — 墨生山河
 *
 * 接手 Scene 1 的浓雾状态，雾散露出生成结果。
 * 流程：浓雾（承接Scene1）→ 雾慢慢散开 → 画卷呈现 → 自动跳转
 */

import { SceneBase } from './sceneBase.js';
import { APP_EVENTS } from '../config/constants.js';
import { GenerationService } from '../services/generationService.js';
import { ApiClient } from '../services/apiClient.js';

export const sceneGenerate = {
  name: 'scene-generate',
  description: '第二幕：提交草图并等待 AI 生成',
  label: '墨生山河',
};

// ---------------------------------------------------------------------------
// 雾粒子（承接Scene1的雾感）
// ---------------------------------------------------------------------------

class FogParticle {
  constructor(w, h, side) { this.w = w; this.h = h; this.side = side; this.reset(true); }
  reset(init) {
    this.r = 20 + Math.random() * 75;
    this.baseA = 0.04 + Math.random() * 0.20;
    this.x = this.side === 'left'   ? (init ? Math.random() * this.w * 0.45 : -this.r - 60)
           : this.side === 'right'  ? (init ? this.w * 0.55 + Math.random() * this.w * 0.45 : this.w + this.r + 60)
           : this.side === 'top'    ? (init ? Math.random() * this.w : Math.random() * this.w)
           : (init ? Math.random() * this.w : Math.random() * this.w);
    this.y = this.side === 'top'    ? (init ? Math.random() * this.h * 0.4 : -this.r - 40)
           : this.side === 'bottom' ? (init ? this.h * 0.6 + Math.random() * this.h * 0.4 : this.h + this.r + 40)
           : Math.random() * this.h;
    this.dx = this.side === 'left' ? 0.10 : this.side === 'right' ? -0.10 : (Math.random() - 0.5) * 0.12;
    this.dy = this.side === 'top' ? 0.08 : this.side === 'bottom' ? -0.08 : (Math.random() - 0.5) * 0.22;
    this.wA = 0.2 + Math.random() * 0.5; this.wF = 0.002 + Math.random() * 0.006;
    this.wO = Math.random() * Math.PI * 2;
    this.life = 380 + Math.random() * 420; this.age = init ? Math.random() * this.life : 0;
  }
  tick(speed) {
    this.age += speed;
    const w = Math.sin(this.age * this.wF + this.wO) * this.wA;
    this.x += this.dx * speed + w * 0.3; this.y += this.dy * speed + w * 0.3;
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
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// 画卷
// ---------------------------------------------------------------------------

function drawScroll(ctx, x, y, w, h, t) {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#f4ebd6'); g.addColorStop(0.35, '#ede0c2');
  g.addColorStop(0.65, '#efe3c8'); g.addColorStop(1, '#f2e9d2');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(170,148,108,0.05)'; ctx.lineWidth = 0.5;
  for (let i = x; i < x + w; i += 3 + Math.sin(i * 0.25) * 0.8) {
    ctx.beginPath(); ctx.moveTo(i, y);
    ctx.lineTo(i + Math.sin(t * 0.00015 + i * 0.007) * 0.3, y + h); ctx.stroke();
  }
  for (let i = y; i < y + h; i += 4) {
    ctx.beginPath(); ctx.moveTo(x, i);
    ctx.lineTo(x + w, i + Math.cos(t * 0.0002 + i * 0.008) * 0.2); ctx.stroke();
  }
  const rh = Math.min(12, h * 0.03);
  const rod = (ry) => {
    const rg = ctx.createLinearGradient(x, ry, x, ry + rh);
    rg.addColorStop(0, '#876d4a'); rg.addColorStop(0.35, '#bfa375');
    rg.addColorStop(0.5, '#cfb78c'); rg.addColorStop(0.65, '#bfa375');
    rg.addColorStop(1, '#876d4a'); return rg;
  };
  ctx.fillStyle = rod(y - rh); ctx.fillRect(x - 8, y - rh, w + 16, rh);
  ctx.fillStyle = rod(y + h); ctx.fillRect(x - 8, y + h, w + 16, rh);
  ctx.strokeStyle = 'rgba(135,104,62,0.14)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
  ctx.restore();
}

/**
 * 保持原比例在目标区域内居中绘制图片，并裁掉底部水印
 * @param {CanvasRenderingContext2D} ctx
 * @param {Image} img - 源图片
 * @param {number} tx - 目标区域 x
 * @param {number} ty - 目标区域 y
 * @param {number} tw - 目标区域宽度
 * @param {number} th - 目标区域高度
 * @param {number} cropBottomRatio - 裁掉底部比例（默认 0.04 = 4%，水印高度）
 */
function drawImageContain(ctx, img, tx, ty, tw, th, cropBottomRatio = 0.04) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  // 裁掉底部水印区域
  const cropH = ih * (1 - cropBottomRatio);
  const scale = Math.min(tw / iw, th / cropH);
  const dw = iw * scale;
  const dh = cropH * scale;
  const dx = tx + (tw - dw) / 2;
  const dy = ty + (th - dh) / 2;

  ctx.drawImage(img,
    0, 0, iw, cropH,          // 源区域（裁掉底部）
    dx, dy, dw, dh,            // 目标区域（居中 contain）
  );
}

// ---------------------------------------------------------------------------
// Scene 2
// ---------------------------------------------------------------------------

export class SceneGenerate extends SceneBase {
  constructor(opts) {
    super({ ...opts, name: sceneGenerate.name });
    this.def = sceneGenerate;
    this.appState = opts.appState;
    this.genService = opts.generationService;

    this.canvas = null; this.ctx = null;
    this.w = 0; this.h = 0;
    this.elapsed = 0;
    this.img = null; this.imgSrc = '';
    this.fogLevel = 0.96;
    this.fogTarget = 0;
    this.fogPs = []; this.fogMax = 80;
    this.phase = 'generating'; // 'generating' | 'fogClearing' | 'showing' | 'zooming'
    this.phaseTime = 0;
    this.zoomProgress = 0;
    this.imgFailed = false;
    this.fallbackImg = null;
    this.apiClient = new ApiClient();
    this.genService = new GenerationService(this.apiClient);
    this.boundResize = () => this.resize();
  }

  enter() {
    this.elapsed = 0;
    this.fogLevel = 0.96;
    this.fogTarget = 0;        // 立刻开始散雾！
    this.phase = 'clearing';   // 先散雾，露出草图
    this.phaseTime = 0;
    this.zoomProgress = 0;
    this.imgFailed = false;
    this.apiDone = false;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'generate-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    this.resize();

    // 黑幕过渡：承接 Scene 1 墨迹扩散的黑色，平滑过渡到雾
    this._darkVeil = document.createElement('div');
    this._darkVeil.style.cssText = 'position:fixed;inset:0;z-index:10;background:#141210;pointer-events:none;opacity:1;transition:opacity 1.5s ease-out;';
    document.body.appendChild(this._darkVeil);
    requestAnimationFrame(() => { if(this._darkVeil) this._darkVeil.style.opacity = '0'; });

    // 科普文案
    this._captionEl = document.createElement('div');
    this._captionEl.className = 'gen-captions';
    this._captionEl.innerHTML = `
      <div class="gen-caption gen-caption-left">
        <h3>《千里江山图》</h3>
        <p>北宋时期，少年画家<b>王希孟</b>创作此卷，以青绿之色描绘千里山河。</p>
        <p>画卷横跨群山、江河、村舍与人物，在有限的尺幅中展现无限天地。</p>
        <p><b>石青</b>与<b>石绿</b>的矿物颜料，历经千年依旧鲜艳。</p>
      </div>
      <div class="gen-caption gen-caption-right">
        <p>它不仅是一幅山水画，更是一场关于<b>自然</b>、<b>时间</b>与<b>理想世界</b>的想象。</p>
        <p>如今，这幅千年前的山河，将在数字空间中<b>再次展开</b>。</p>
      </div>`;
    this.container.appendChild(this._captionEl);

    // 预填粒子
    this.fogPs = [];
    for (let i = 0; i < this.fogMax; i++) {
      const s = ['left', 'right', 'top', 'bottom'][Math.floor(Math.random() * 4)];
      this.fogPs.push(new FogParticle(this.w, this.h, s));
    }

    window.addEventListener('resize', this.boundResize);

    // 预加载回退草图
    const sketchUrl = this.appState.getLatestSketchDataUrl();
    if (sketchUrl) {
      this.fallbackImg = new Image();
      this.fallbackImg.src = sketchUrl;
    }

    // ---- 调用豆包 API（在 Scene 2 中等）----
    this.callApi();
  }

  async callApi() {
    const sketchUrl = this.appState.getLatestSketchDataUrl() || 'data:image/png;base64,placeholder';
    try {
      const res = await this.genService.generate({
        sketchDataUrl: sketchUrl,
        prompt: '青绿山水，云气流动，绢本质感',
        scene: 'scene-generate',
      });
      this.appState.setLatestGeneration(res);
      const imageUrl = res?.image_url || '';
      const isValid = imageUrl.startsWith('http') || imageUrl.startsWith('data:image');
      if (isValid) {
        this.img = new Image();
        this.img.onload = () => {};
        this.img.onerror = () => { this.imgFailed = true; this.img = null; };
        this.img.src = imageUrl;
        this.imgSrc = imageUrl;
      } else {
        this.imgFailed = true;
      }
    } catch (_e) {
      this.imgFailed = true;
    }
    this.apiDone = true;
  }

  exit() {
    window.removeEventListener('resize', this.boundResize);
    if (this.canvas) { this.canvas.remove(); this.canvas = null; }
    if (this._captionEl) { this._captionEl.remove(); this._captionEl = null; }
    if (this._darkVeil) { this._darkVeil.remove(); this._darkVeil = null; }
  }

  resize() {
    if (!this.canvas) return;
    this.w = this.container.clientWidth || window.innerWidth;
    this.h = this.container.clientHeight || window.innerHeight;
    this.canvas.width = this.w; this.canvas.height = this.h;
  }

  update(dt) {
    if (!this.ctx || !this.w || !this.h) return;
    this.elapsed += dt;
    this.phaseTime += dt;

    // ===== 阶段驱动 =====

    // ===== 阶段驱动 =====

    if (this.phase === 'clearing') {
      // 雾快速散去，露出画卷上的草图
      const diff = this.fogTarget - this.fogLevel;
      this.fogLevel += diff * (1 - Math.exp(-2.0 * dt / 1000));

      if (this.fogLevel < 0.06) {
        this.phase = 'waiting';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'waiting') {
      // 草图清晰可见，等待豆包 API 返回
      if (this.apiDone) {
        this.phase = 'showing';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'showing') {
      // 展示 2s 后画卷放大
      if (this.phaseTime > 2000) {
        this.phase = 'zooming';
        this.phaseTime = 0;
        // 淡出科普文案
        if (this._captionEl) this._captionEl.style.opacity = '0';
      }
    } else if (this.phase === 'zooming') {
      // 画卷放大占满屏 → Scene 3
      const dur = 1500;
      const t = Math.min(1, this.phaseTime / dur);
      this.zoomProgress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      if (t >= 1) {
        this.requestNextScene();
        return;
      }
    }

    // 超时兜底：90s 总时长
    if (this.elapsed > 90000) {
      this.requestNextScene();
      return;
    }

    // 更新粒子
    const speed = this.phase === 'generating' ? 1.5
      : this.phase === 'fogClearing' ? 1.2
      : 0.3 + this.fogLevel * 0.8;
    while (this.fogPs.length < this.fogMax) {
      const s = ['left', 'right', 'top', 'bottom'][Math.floor(Math.random() * 4)];
      this.fogPs.push(new FogParticle(this.w, this.h, s));
    }
    this.fogPs = this.fogPs.filter(p => p.tick(speed));

    this.draw();
  }

  draw() {
    const C = this.ctx, W = this.w, H = this.h;

    // ---- 宣纸背景 ----
    const bg = C.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f6f0e4'); bg.addColorStop(0.5, '#ede2c8'); bg.addColorStop(1, '#f4ecd8');
    C.fillStyle = bg; C.fillRect(0, 0, W, H);

    // ---- 画卷（zoom 阶段放大占满屏幕） ----
    const zoom = this.phase === 'zooming' ? this.zoomProgress : 0;
    const sw0 = Math.min(W * 0.48, 640), sh0 = Math.min(H * 0.68, 480);

    // 从原始尺寸线性放大到屏幕尺寸
    const sw = sw0 + (W - sw0) * zoom;
    const sh = sh0 + (H - sh0) * zoom;
    const sx = (W - sw) / 2, sy = (H - sh) / 2;
    drawScroll(C, sx, sy, sw, sh, this.elapsed);

    // --- 画心内容：始终展示用户草图（AI 图留给 Scene 3）---
    const sketch = this.fallbackImg;
    if (sketch && sketch.complete) {
      C.save();
      C.globalAlpha = Math.min(1, this.elapsed / 1500);
      const pad = 10;
      drawImageContain(C, sketch, sx + pad, sy + pad, sw - pad * 2, sh - pad * 2, 0);
      C.restore();
    }

    // ---- 雾气层 ----
    const I = this.fogLevel;
    if (I > 0.005) {
      // 粒子
      for (const p of this.fogPs) p.draw(C);

      // 四边雾幕
      const cw = W * (0.02 + I * 0.46);
      if (cw > 2) {
        // 左
        const gl = C.createLinearGradient(0, 0, cw, 0);
        gl.addColorStop(0, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
        gl.addColorStop(0.75, `rgba(245,241,228,${Math.min(1, I * 0.85)})`);
        gl.addColorStop(0.9, `rgba(245,241,228,${I * 0.3})`);
        gl.addColorStop(1, 'rgba(245,241,228,0)');
        C.fillStyle = gl; C.fillRect(0, 0, cw, H);
        // 右
        const gr = C.createLinearGradient(W - cw, 0, W, 0);
        gr.addColorStop(0, 'rgba(245,241,228,0)');
        gr.addColorStop(0.1, `rgba(245,241,228,${I * 0.3})`);
        gr.addColorStop(0.25, `rgba(245,241,228,${Math.min(1, I * 0.85)})`);
        gr.addColorStop(1, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
        C.fillStyle = gr; C.fillRect(W - cw, 0, cw, H);
      }
      const ch = H * (0.02 + I * 0.46);
      if (ch > 2) {
        // 上
        const gt = C.createLinearGradient(0, 0, 0, ch);
        gt.addColorStop(0, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
        gt.addColorStop(0.8, `rgba(245,241,228,${I * 0.3})`);
        gt.addColorStop(1, 'rgba(245,241,228,0)');
        C.fillStyle = gt; C.fillRect(0, 0, W, ch);
        // 下
        const gb = C.createLinearGradient(0, H - ch, 0, H);
        gb.addColorStop(0, 'rgba(245,241,228,0)');
        gb.addColorStop(0.2, `rgba(245,241,228,${I * 0.3})`);
        gb.addColorStop(1, `rgba(245,241,228,${Math.min(1, I * 1.05)})`);
        C.fillStyle = gb; C.fillRect(0, H - ch, W, ch);
      }

      // 中心雾纱
      if (I > 0.25) {
        const ca = I < 0.6 ? (I - 0.25) * 0.3 : 0.1 + (I - 0.6) * 2.0;
        C.fillStyle = `rgba(245,241,228,${Math.min(0.92, ca)})`;
        C.fillRect(0, 0, W, H);
      }
    }

    // ---- 标题 ----
    C.save();
    C.textAlign = 'center'; C.textBaseline = 'middle';
    C.fillStyle = `rgba(42,54,44,${0.45 - I * 0.4})`;
    C.font = `400 ${Math.min(32, W * 0.022)}px "Noto Serif SC", serif`;
    C.fillText('墨  生  山  河', W / 2, H * 0.10);

    // 底部状态
    if (this.phase === 'waiting') {
      const dots = '.'.repeat(Math.floor((this.elapsed / 600) % 4));
      C.fillStyle = `rgba(56,46,28,${0.35 + Math.sin(this.elapsed * 0.002) * 0.12})`;
      C.font = `${Math.min(16, W * 0.011)}px "Noto Serif SC", serif`;
      C.fillText(`墨韵凝聚中${dots}`, W / 2, H * 0.84);
    } else if (this.phase === 'clearing' || this.phase === 'showing') {
      C.fillStyle = `rgba(56,46,28,0.4)`;
      C.font = `${Math.min(16, W * 0.011)}px "Noto Serif SC", serif`;
      C.fillText(this.phase === 'clearing' ? '云开雾散...' : '墨生山河', W / 2, H * 0.84);
    } else if (this.phase === 'zooming') {
      C.fillStyle = `rgba(56,46,28,0.5)`;
      C.font = `${Math.min(16, W * 0.011)}px "Noto Serif SC", serif`;
      C.fillText('画卷徐开...', W / 2, H * 0.84);
    } else {
      const imgLoading = this.img && !this.img.complete;
      if (I < 0.1 && imgLoading) {
        C.fillStyle = `rgba(56,46,28,${0.4 + Math.sin(this.elapsed * 0.005) * 0.15})`;
        C.font = `${Math.min(16, W * 0.011)}px "Noto Serif SC", serif`;
        C.fillText('山河载入中...', W / 2, H * 0.84);
      } else if (I < 0.1) {
        C.fillStyle = 'rgba(56,82,46,0.45)';
        C.font = `${Math.min(16, W * 0.011)}px "Noto Serif SC", serif`;
        C.fillText('江山已现', W / 2, H * 0.84);
      } else if (I > 0.3) {
        C.fillStyle = `rgba(56,46,28,${0.3 + Math.sin(this.elapsed * 0.003) * 0.1})`;
        C.font = `${Math.min(16, W * 0.011)}px "Noto Serif SC", serif`;
        C.fillText('云开雾散...', W / 2, H * 0.84);
      }
    }
    C.restore();
  }
}
