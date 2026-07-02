/**
 * Single-object observable state for controllers. Distinct from the keyed KV
 * ChelonStore (preferences): one object, whole-snapshot subscription, and an
 * explicit destroy() lifecycle for observer teardown.
 */
export interface MicroStore<T> {
  getSnapshot(): T;
  setState(update: Partial<T> | ((prev: T) => Partial<T>)): void;
  subscribe(callback: () => void): () => void;
  destroy(): void;
  onDestroy(cleanup: () => void): void;
}

export function createMicroStore<T extends object>(initial: T): MicroStore<T> {
  let state = initial;
  let destroyed = false;
  const subscribers = new Set<() => void>();
  const cleanups = new Set<() => void>();

  return {
    getSnapshot: () => state,
    setState(update) {
      if (destroyed) return;
      const patch = typeof update === "function" ? update(state) : update;
      let changed = false;
      for (const [key, value] of Object.entries(patch)) {
        if (!Object.is(state[key as keyof T], value)) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      for (const cb of subscribers) cb();
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => void subscribers.delete(callback);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const cleanup of cleanups) cleanup();
      cleanups.clear();
      subscribers.clear();
    },
    onDestroy(cleanup) {
      if (destroyed) {
        cleanup();
        return;
      }
      cleanups.add(cleanup);
    },
  };
}
