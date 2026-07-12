export class FluidField {
  constructor(width, height, cellSize = 24) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.columns = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.velocityX = new Float32Array(this.columns * this.rows);
    this.velocityY = new Float32Array(this.columns * this.rows);
    this.density = new Float32Array(this.columns * this.rows);
  }

  clear() {
    this.velocityX.fill(0);
    this.velocityY.fill(0);
    this.density.fill(0);
  }

  addDensity(x, y, amount) {
    const index = this.getIndex(x, y);
    if (index >= 0) {
      this.density[index] = Math.min(1, this.density[index] + amount);
    }
  }

  addVelocity(x, y, forceX, forceY) {
    const index = this.getIndex(x, y);
    if (index >= 0) {
      this.velocityX[index] += forceX;
      this.velocityY[index] += forceY;
    }
  }

  getIndex(x, y) {
    const column = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    if (column < 0 || row < 0 || column >= this.columns || row >= this.rows) {
      return -1;
    }
    return row * this.columns + column;
  }

  update() {
    for (let index = 0; index < this.density.length; index += 1) {
      this.density[index] *= 0.985;
      this.velocityX[index] *= 0.94;
      this.velocityY[index] *= 0.94;
    }
  }
}
