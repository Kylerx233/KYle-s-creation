export class ResourceManager {
  constructor() {
    this.cache = new Map();
  }

  loadImage(src) {
    if (this.cache.has(src)) {
      return this.cache.get(src);
    }
    const image = new Image();
    image.src = src;
    this.cache.set(src, image);
    return image;
  }

  get(key) {
    return this.cache.get(key);
  }
}