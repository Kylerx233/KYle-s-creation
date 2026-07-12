export class FrameMonitor {
  constructor() {
    this.samples = [];
    this.fps = 0;
    this.lastUpdate = 0;
  }

  tick(deltaTime) {
    if (deltaTime <= 0) {
      return this.fps;
    }

    const instantFps = 1000 / deltaTime;
    this.samples.push(instantFps);
    if (this.samples.length > 30) {
      this.samples.shift();
    }

    const sum = this.samples.reduce((total, value) => total + value, 0);
    this.fps = Math.round(sum / this.samples.length);
    this.lastUpdate = performance.now();
    return this.fps;
  }
}