import type { ConcurrencyGate } from './http.types.js';

export function createConcurrencyGate(limit: number): ConcurrencyGate {
  let running = 0;
  return {
    tryEnter() {
      if (running >= limit) return false;
      running++;
      return true;
    },
    leave() { running = Math.max(0, running - 1); },
  };
}
