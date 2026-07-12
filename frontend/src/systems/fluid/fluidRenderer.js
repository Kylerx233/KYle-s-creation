export class FluidRenderer {
  constructor(context, field) {
    this.context = context;
    this.field = field;
  }

  render() {
    const { columns, rows, cellSize, density, velocityX, velocityY } = this.field;
    this.context.save();
    this.context.globalCompositeOperation = 'screen';
    this.context.lineCap = 'round';

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const value = density[index];
        if (value <= 0.01) {
          continue;
        }

        const centerX = column * cellSize + cellSize * 0.5;
        const centerY = row * cellSize + cellSize * 0.5;
        const vx = velocityX[index] || 0;
        const vy = velocityY[index] || 0;
        const speed = Math.hypot(vx, vy);
        const trail = Math.min(cellSize * 1.15, speed * 0.38 + cellSize * 0.22);
        const dirX = speed > 0.001 ? vx / speed : 1;
        const dirY = speed > 0.001 ? vy / speed : 0;

        this.context.strokeStyle = `rgba(62, 88, 66, ${Math.min(0.2, value * 0.2)})`;
        this.context.lineWidth = Math.max(1.2, cellSize * (0.11 + value * 0.22));
        this.context.beginPath();
        this.context.moveTo(centerX - dirX * trail, centerY - dirY * trail);
        this.context.lineTo(centerX + dirX * trail, centerY + dirY * trail);
        this.context.stroke();
      }
    }
    this.context.restore();
  }
}
