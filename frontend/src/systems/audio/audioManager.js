/**
 * BGM 音频管理器
 * - 空山私语 (bgm-mountains.mp3)：首页 + 第一幕绘画
 * - 江南烟雨 (bgm-mist.mp3)    ：第二幕起
 */
export class AudioManager {
  constructor() {
    this.tracks = {
      mountains: new Audio('/bgm-mountains.mp3'),
      mist: new Audio('/bgm-mist.mp3'),
    };
    Object.values(this.tracks).forEach(a => {
      a.loop = true;
      a.volume = 0;
      a.preload = 'auto';
    });
    this.current = null;
    this.targetVolume = 0.45;
    this.fadeSpeed = 0.008;
    this.enabled = false;
    this._ticking = false;
  }

  /** 用户交互后调用，启用音频并开始播放第一首 */
  start(track = 'mountains') {
    if (this.enabled) return;
    this.enabled = true;
    this.crossfade(track, 0);
    if (!this._ticking) {
      this._ticking = true;
      this._tick();
    }
  }

  /** 切换到指定音轨 */
  crossfade(track, duration = 1200) {
    if (!this.enabled) return;
    const target = this.tracks[track];
    if (!target || this.current === target) return;
    if (this.current) {
      this._fadeOutTarget = this.current;
      this._fadeOutDuration = duration;
      this._fadeOutElapsed = 0;
      this._fadeOutStartVol = this.current.volume;
    }
    this.current = target;
    if (target.paused) {
      target.volume = 0;
      target.play().catch(() => {});
    }
    this._fadeInTarget = target;
    this._fadeInDuration = duration;
    this._fadeInElapsed = 0;
    this._fadeInStartVol = target.volume;
  }

  setVolume(v) {
    this.targetVolume = Math.max(0, Math.min(1, v));
  }

  _tick() {
    if (!this.enabled) { this._ticking = false; return; }
    const dt = 16; // ~60fps

    // 淡入
    if (this._fadeInTarget) {
      this._fadeInElapsed += dt;
      const t = Math.min(1, this._fadeInElapsed / this._fadeInDuration);
      const e = t < .5 ? 2*t*t : -1+(4-2*t)*t; // easeInOutQuad
      this._fadeInTarget.volume = this._fadeInStartVol + (this.targetVolume - this._fadeInStartVol) * e;
      if (t >= 1) this._fadeInTarget = null;
    }

    // 淡出
    if (this._fadeOutTarget) {
      this._fadeOutElapsed += dt;
      const t = Math.min(1, this._fadeOutElapsed / this._fadeOutDuration);
      const e = t < .5 ? 2*t*t : -1+(4-2*t)*t;
      this._fadeOutTarget.volume = this._fadeOutStartVol * (1 - e);
      if (t >= 1) {
        this._fadeOutTarget.pause();
        this._fadeOutTarget.volume = 0;
        this._fadeOutTarget = null;
      }
    }

    requestAnimationFrame(() => this._tick());
  }
}
