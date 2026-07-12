export class Brush {
  constructor({ size = 22, color = [30, 24, 20], inkLoad = 0.7 } = {}) {
    this.size = size;
    this.color = color;
    this.inkLoad = inkLoad;
  }

  setSize(size) {
    this.size = Math.max(4, Math.min(64, size));
  }

  setInkLoad(inkLoad) {
    this.inkLoad = Math.max(0.1, Math.min(1, inkLoad));
  }

  drawStroke(context, fromPoint, toPoint, options = {}) {
    const pressure = options.pressure ?? 0.55;
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const distance = Math.hypot(dx, dy);
    const speedFactor = Math.max(0.45, 1 - distance / 42);
    const width = this.size * (0.55 + pressure * 0.75) * speedFactor;
    const alpha = Math.max(0.16, Math.min(0.9, this.inkLoad * (0.35 + pressure * 0.7)));

    context.save();
    context.strokeStyle = `rgba(${this.color.join(',')}, ${alpha})`;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(fromPoint.x, fromPoint.y);
    context.lineTo(toPoint.x, toPoint.y);
    context.stroke();
    context.restore();

    return {
      width,
      intensity: Math.max(0.08, Math.min(1, alpha * 0.95)),
    };
  }
}
