export class InkField {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.field = new Float32Array(width * height);
    this.buffer = new Float32Array(width * height);
    this.imageData = new Uint8ClampedArray(width * height * 4);
  }

  clear() {
    this.field.fill(0);
    this.buffer.fill(0);
  }

  inject(x, y, radius, intensity) {
    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(y + radius));
    const radiusSquared = radius * radius;

    for (let row = minY; row <= maxY; row += 1) {
      for (let column = minX; column <= maxX; column += 1) {
        const dx = column - x;
        const dy = row - y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > radiusSquared) {
          continue;
        }
        const falloff = 1 - distanceSquared / radiusSquared;
        const index = row * this.width + column;
        this.field[index] = Math.min(1, this.field[index] + intensity * falloff);
      }
    }
  }

  update(evaporation = 0.0012, diffusion = 0.12) {
    const width = this.width;
    const height = this.height;
    for (let row = 1; row < height - 1; row += 1) {
      for (let column = 1; column < width - 1; column += 1) {
        const index = row * width + column;
        const current = this.field[index];
        const neighborAverage = (
          this.field[index - 1] +
          this.field[index + 1] +
          this.field[index - width] +
          this.field[index + width]
        ) * 0.25;

        const diffused = current + (neighborAverage - current) * diffusion;
        this.buffer[index] = Math.max(0, diffused - evaporation);
      }
    }

    const lastRow = width * (height - 1);
    for (let column = 0; column < width; column += 1) {
      this.buffer[column] = Math.max(0, this.field[column] - evaporation * 1.5);
      this.buffer[lastRow + column] = Math.max(0, this.field[lastRow + column] - evaporation * 1.5);
    }
    for (let row = 0; row < height; row += 1) {
      const left = row * width;
      const right = left + width - 1;
      this.buffer[left] = Math.max(0, this.field[left] - evaporation * 1.5);
      this.buffer[right] = Math.max(0, this.field[right] - evaporation * 1.5);
    }

    const temp = this.field;
    this.field = this.buffer;
    this.buffer = temp;
  }

  toImageData() {
    for (let index = 0; index < this.field.length; index += 1) {
      const intensity = Math.max(0, Math.min(1, this.field[index]));
      const shade = Math.round(intensity * 255);
      const offset = index * 4;
      this.imageData[offset] = Math.round(26 + intensity * 16);
      this.imageData[offset + 1] = Math.round(20 + intensity * 8);
      this.imageData[offset + 2] = Math.round(18 + intensity * 5);
      this.imageData[offset + 3] = shade;
    }
    return new ImageData(this.imageData, this.width, this.height);
  }
}
