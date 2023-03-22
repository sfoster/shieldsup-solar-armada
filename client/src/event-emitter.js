export function EventEmitterMixin(base) {
  return class extends base {
    constructor(...args) {
      super(...args);
      this._events = new Map();
    }
    on(topic, listener) {
      if (this._events.has(topic)) {
        this._events.get(topic).add(listener);
      } else {
        this._events.set(topic, new Set([listener]));
      }
    }
    off(topic, listener) {
      if (!this._events.has(topic)) {
        return;
      }
      this._events.get(topic).delete(listener);
    }
    emit(topic, ...args) {
      if (!this._events.has(topic)) {
        return;
      }
      for (let listener of this._events.get(topic).values()) {
        try {
          if (typeof listener.handleTopic == "function") {
            listener.handleTopic(topic, ...args);
          } else {
            listener.apply(this, args);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  };
}