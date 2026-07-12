export class Ticker {
  constructor() {
    this.rafId = null;
    this.lastTime = 0;
  }

  start(updateFn) {
    const step = (time) => {
      const delta = this.lastTime === 0 ? 0 : time - this.lastTime;
      this.lastTime = time;
      updateFn(delta);
      this.rafId = window.requestAnimationFrame(step);
    };
    this.stop();
    this.rafId = window.requestAnimationFrame(step);
  }

  stop() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}