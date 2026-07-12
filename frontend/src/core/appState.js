import { Cache } from './cache.js';

export class AppState {
  constructor() {
    this.cache = new Cache();
    this.keys = {
      latestSketchDataUrl: 'latestSketchDataUrl',
      latestGeneration: 'latestGeneration',
    };
  }

  setLatestSketchDataUrl(value) {
    this.cache.set(this.keys.latestSketchDataUrl, value);
  }

  getLatestSketchDataUrl() {
    return this.cache.get(this.keys.latestSketchDataUrl) || '';
  }

  setLatestGeneration(value) {
    this.cache.set(this.keys.latestGeneration, value);
  }

  getLatestGeneration() {
    return this.cache.get(this.keys.latestGeneration) || null;
  }
}
