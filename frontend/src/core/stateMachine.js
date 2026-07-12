export class StateMachine {
  constructor(initialState) {
    this.currentState = initialState;
    this.transitions = new Map();
  }

  getState() {
    return this.currentState;
  }

  setState(state) {
    this.currentState = state;
    return this.currentState;
  }

  addTransition(fromState, eventName, toState) {
    if (!this.transitions.has(fromState)) {
      this.transitions.set(fromState, new Map());
    }
    this.transitions.get(fromState).set(eventName, toState);
  }

  canTransition(eventName) {
    const stateTransitions = this.transitions.get(this.currentState);
    return Boolean(stateTransitions && stateTransitions.has(eventName));
  }

  transition(eventName) {
    const stateTransitions = this.transitions.get(this.currentState);
    if (!stateTransitions || !stateTransitions.has(eventName)) {
      return this.currentState;
    }
    this.currentState = stateTransitions.get(eventName);
    return this.currentState;
  }
}