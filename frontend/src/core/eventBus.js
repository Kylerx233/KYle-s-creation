export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
  }

  off(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(eventName, payload) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => handler(payload));
  }
}