/**
 * Scene 3 — 画卷徐开
 *
 * 承接 Scene 2 的放大效果，画卷卷起后慢慢展开，AI 画面随之显现。
 * 动画：
 *   1. 卷起状态：画卷收拢为中央一条窄带
 *   2. 展开过程：画卷从中心向上下展开
 *   3. 完全展开：画心呈现 AI 生成图，停留后自动跳转
 */

import { SceneBase } from './sceneBase.js';

export const sceneUnfold = {
  name: 'scene-unfold',
  description: '第三幕：画卷展开',
  label: '画卷徐开',
};

// ---------------------------------------------------------------------------
// 缓动
// ---------------------------------------------------------------------------

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t) {
  const s = 1.70158;
  return 1 + (--t) * t * ((s + 1) * t + s);
}

// ---------------------------------------------------------------------------
// 画卷绘制工具
// ---------------------------------------------------------------------------

/** 绘制卷轴横杆 */
function drawRod(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#6b5538'); g.addColorStop(0.2, '#a08860');
  g.addColorStop(0.4, '#c4aa7e'); g.addColorStop(0.5, '#d2b890');
  g.addColorStop(0.6, '#c4aa7e'); g.addColorStop(0.8, '#a08860');
  g.addColorStop(1, '#6b5538');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // 轴头圆形凸起（两侧）
  const knobR = h * 0.55;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x - 2, y + h / 2, knobR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w + 2, y + h / 2, knobR, 0, Math.PI * 2); ctx.fill();
}

/**
 * 保持原比例在目标区域内居中绘制，裁掉底部水印
 */
function drawImageContain(ctx, img, tx, ty, tw, th, cropBottomRatio = 0.04) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const cropH = ih * (1 - cropBottomRatio);
  const scale = Math.min(tw / iw, th / cropH);
  const dw = iw * scale;
  const dh = cropH * scale;
  const dx = tx + (tw - dw) / 2;
  const dy = ty + (th - dh) / 2;
  ctx.drawImage(img, 0, 0, iw, cropH, dx, dy, dw, dh);
}

/** 在画心绘制绢布纹理 */
function drawPaper(ctx, x, y, w, h, t) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#f5ecd7'); g.addColorStop(0.3, '#efe2c5');
  g.addColorStop(0.7, '#f0e5cc'); g.addColorStop(1, '#f4ebd4');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // 纹理线
  ctx.strokeStyle = 'rgba(160,138,105,0.045)'; ctx.lineWidth = 0.5;
  for (let i = x; i < x + w; i += 3 + Math.sin(i * 0.25) * 0.7) {
    ctx.beginPath(); ctx.moveTo(i, y);
    ctx.lineTo(i + Math.sin(t * 0.00015 + i * 0.007) * 0.25, y + h); ctx.stroke();
  }

  // 细边框
  ctx.strokeStyle = 'rgba(130,100,58,0.15)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
}

// ---------------------------------------------------------------------------
// Scene 3
// ---------------------------------------------------------------------------

export class SceneUnfold extends SceneBase {
  constructor(opts) {
    super({ ...opts, name: sceneUnfold.name });
    this.def = sceneUnfold;
    this.appState = opts.appState;

    this.canvas = null; this.ctx = null;
    this.w = 0; this.h = 0;
    this.elapsed = 0;

    // 动画阶段：'open' | 'rollingUp' | 'rolled' | 'unrolling' | 'showing'
    this.phase = 'open';
    this.phaseTime = 0;
    this.unroll = 1;  // 承接 Scene 2 zoom，初始完全展开
    this.img = null;
    this.imgFailed = false;
    this.fallbackImg = null;

    this.boundResize = () => this.resize();
  }

  // ===== 生命周期 =====

  enter() {
    this.elapsed = 0;
    this.phase = 'open';
    this.phaseTime = 0;
    this.unroll = 1;
    this.img = null;
    this.imgFailed = false;
    this.fallbackImg = null;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'generate-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    this.resize();
    window.addEventListener('resize', this.boundResize);

    // 加载 AI 生成图
    const cached = this.appState.getLatestGeneration();
    const sketchUrl = this.appState.getLatestSketchDataUrl();
    const imageUrl = cached?.image_url || '';
    const isValid = imageUrl.startsWith('http') || imageUrl.startsWith('data:image');

    if (sketchUrl) {
      this.fallbackImg = new Image();
      this.fallbackImg.src = sketchUrl;
    }

    if (isValid) {
      this.img = new Image();
      this.img.onload = () => {};
      this.img.onerror = () => {
        this.imgFailed = true;
        this.img = null;
      };
      this.img.src = imageUrl;
    } else {
      this.imgFailed = true;
      this.img = null;
    }
  }

  exit() {
    window.removeEventListener('resize', this.boundResize);
    if (this.canvas) { this.canvas.remove(); this.canvas = null; }
  }

  resize() {
    if (!this.canvas) return;
    this.w = this.container.clientWidth || window.innerWidth;
    this.h = this.container.clientHeight || window.innerHeight;
    this.canvas.width = this.w; this.canvas.height = this.h;
  }

  // ===== 动画 =====

  update(dt) {
    if (!this.ctx || !this.w || !this.h) return;
    this.elapsed += dt;
    this.phaseTime += dt;

    if (this.phase === 'open') {
      // 承接 Scene 2 zoom，画卷完全展开，短暂停留
      this.unroll = 1;
      if (this.phaseTime > 800) {
        this.phase = 'rollingUp';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'rollingUp') {
      // 画卷从展开状态卷起
      const dur = 1500;
      const t = Math.min(1, this.phaseTime / dur);
      this.unroll = 1 - easeInOutCubic(t);  // 1 → 0

      if (t >= 1) {
        this.phase = 'rolled';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'rolled') {
      // 卷起状态，等 AI 图就绪后展开
      this.unroll = 0;
      const aiReady = (this.img && this.img.complete) || this.imgFailed;
      const fbReady = this.fallbackImg && this.fallbackImg.complete;
      const timedOut = this.phaseTime > 45000;
      if ((aiReady || fbReady || timedOut) && this.phaseTime > 600) {
        this.phase = 'unrolling';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'unrolling') {
      // 展开，露出 AI 生成图
      const dur = 2500;
      const t = Math.min(1, this.phaseTime / dur);
      this.unroll = easeInOutCubic(t);  // 0 → 1

      if (t >= 1) {
        this.phase = 'showing';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'showing') {
      this.unroll = 1;
      if (this.phaseTime > 3000) {
        this.phase = 'fadingOut';
        this.phaseTime = 0;
        // 创建全屏黑色遮罩
        this._overlay = document.createElement('div');
        this._overlay.id = 'scene-transition-overlay';
        this._overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:#000;opacity:0;pointer-events:none;';
        document.body.appendChild(this._overlay);
      }
    } else if (this.phase === 'fadingOut') {
      this.unroll = 1;
      const dur = 800;
      const t = Math.min(1, this.phaseTime / dur);
      if (this._overlay) this._overlay.style.opacity = easeInOutCubic(t);
      if (t >= 1) {
        this.requestNextScene();
        return;
      }
    }

    this.draw();
  }

  // ===== 绘制 =====

  draw() {
    const C = this.ctx, W = this.w, H = this.h;

    // ---- 暗调背景 ----
    const bg = C.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1e2420'); bg.addColorStop(0.5, '#252d26'); bg.addColorStop(1, '#1a201c');
    C.fillStyle = bg; C.fillRect(0, 0, W, H);

    // ---- 背景微光（画卷周围的光晕） ----
    const glow = C.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.65);
    glow.addColorStop(0, 'rgba(245,235,210,0.09)');
    glow.addColorStop(1, 'rgba(245,235,210,0)');
    C.fillStyle = glow; C.fillRect(0, 0, W, H);

    // ---- 画卷参数 ----
    const rodH = Math.max(14, H * 0.022);
    const marginX = 0;                         // 与 Scene 2 zoom 一致：无边距
    const scrollW = W;                          // 全宽，与 Scene 2 zoom 终点一致
    const maxPaperH = H - rodH * 2;            // 全高减轴杆
    const centerY = H / 2;

    const u = this.unroll;  // 展开进度

    // 卷起时画心高度 → 展开时达到 maxPaperH
    const paperH = maxPaperH * u;

    // 画心 Y 坐标（从中心开始向上下展开）
    const paperY = centerY - paperH / 2;

    // 上轴：位于画心顶部之上
    const topRodY = paperY - rodH;
    // 下轴：位于画心底部之下
    const botRodY = paperY + paperH;

    // ---- 画心纸张 ----
    if (paperH > 2) {
      // 裁剪区域：只显示已展开的纸张
      C.save();
      C.beginPath();
      C.rect(marginX, paperY, scrollW, paperH);
      C.clip();

      drawPaper(C, marginX, paperY, scrollW, maxPaperH, this.elapsed);

      // 画心内容：卷起前展示草图，展开后展示 AI 图
      const isBeforeUnroll = (this.phase === 'open' || this.phase === 'rollingUp');
      const aiImg = (this.img && this.img.complete) ? this.img : null;
      const fbImg = (this.fallbackImg && this.fallbackImg.complete) ? this.fallbackImg : null;

      // 卷起前用草图；展开后用 AI 图（回退用草图）
      const displayImg = isBeforeUnroll ? (fbImg || aiImg) : (aiImg || fbImg);
      const cropWatermark = !isBeforeUnroll && aiImg;  // 只有 AI 图且展开时才裁水印

      if (displayImg) {
        const imgPad = 10;
        C.save();
        C.globalAlpha = Math.min(1, u * 1.2);
        drawImageContain(C, displayImg,
          marginX + imgPad, paperY + imgPad,
          scrollW - imgPad * 2, maxPaperH - imgPad * 2, cropWatermark ? 0.04 : 0);
        C.restore();
      }

      C.restore();
    }

    // ---- 上轴杆 ----
    drawRod(C, marginX, topRodY, scrollW, rodH);

    // ---- 下轴杆 ----
    // 卷起时下轴紧靠上轴，展开时移到底部
    const botY = u < 0.02 ? topRodY + rodH + 2 : botRodY;
    drawRod(C, marginX, botY, scrollW, rodH);

    // ---- 卷起时轴杆间的布面露出的卷边 ----
    if (u < 0.15 && paperH < 6) {
      const foldY = topRodY + rodH;
      const foldH = Math.max(2, botY - foldY);
      C.fillStyle = '#e8dcc4';
      C.fillRect(marginX, foldY, scrollW, foldH);

      // 卷边的纹理褶皱
      C.strokeStyle = 'rgba(160,130,90,0.3)';
      C.lineWidth = 0.8;
      for (let i = marginX; i < marginX + scrollW; i += 8) {
        C.beginPath(); C.moveTo(i, foldY);
        C.lineTo(i + 2, foldY + foldH); C.stroke();
      }
    }

    // ---- 标题 ----
    C.save();
    C.textAlign = 'center'; C.textBaseline = 'middle';

    C.fillStyle = `rgba(220,210,185,${0.25 + u * 0.3})`;
    C.font = `400 ${Math.min(30, W * 0.02)}px "Noto Serif SC", serif`;
    if (this.phase === 'rollingUp') {
      C.fillText('画  卷  卷  起', W / 2, H * 0.08);
    } else if (this.phase === 'rolled') {
      C.fillText('画  卷  待  展', W / 2, H * 0.08);
    } else {
      C.fillText('画  卷  徐  开', W / 2, H * 0.08);
    }

    if (u < 0.1 && this.phase === 'rolled') {
      C.fillStyle = 'rgba(220,210,185,0.5)';
      C.font = `${Math.min(16, W * 0.011)}px "Noto Serif SC", serif`;
      C.fillText('等待山河入画...', W / 2, H * 0.88);
    } else if (u > 0.9 && this.phase === 'showing') {
      C.fillStyle = 'rgba(180,200,160,0.35)';
      C.font = `${Math.min(14, W * 0.01)}px "Noto Serif SC", serif`;
      C.fillText('画卷已展，山河已现', W / 2, H * 0.92);
    }
    C.restore();
  }
}
