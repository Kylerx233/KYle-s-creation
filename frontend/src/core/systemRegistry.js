export class SystemRegistry {
  constructor() {
    this.systems = new Map();
  }

  register(name, system) {
    this.systems.set(name, system);
    return system;
  }

  get(name) {
    return this.systems.get(name);
  }

  startAll() {
    this.systems.forEach((system) => {
      if (typeof system.start === 'function') {
        system.start();
      }
    });
  }

  stopAll() {
    this.systems.forEach((system) => {
      if (typeof system.stop === 'function') {
        system.stop();
      }
    });
  }

  updateAll(deltaTime) {
    this.systems.forEach((system) => {
      if (typeof system.update === 'function') {
        system.update(deltaTime);
      }
    });
  }
}