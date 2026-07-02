/** Persistence backend. Optional external-change feed (e.g. cross-tab). */
export interface StoreAdapter {
  getItem(key: string): unknown;
  setItem(key: string, value: unknown): void;
  removeItem(key: string): void;
  subscribeExternal?(
    onChange: (key: string, value: unknown) => void,
  ): () => void;
}

/**
 * Keyed KV store with native per-key notification: a write to key A notifies
 * only A's subscribers — no selector sweep. Values cached in-memory for
 * reference-stable snapshots (useSyncExternalStore-compatible); the adapter
 * is a write-through persistence layer, hydrated lazily per key.
 */
export interface ChelonStore {
  getItem<T>(key: string): T | undefined;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  subscribe(key: string, callback: () => void): () => void;
  keys(): string[];
}

export function createStore(adapter?: StoreAdapter): ChelonStore {
  const cache = new Map<string, unknown>();
  const hydrated = new Set<string>();
  const subscribers = new Map<string, Set<() => void>>();

  const notify = (key: string) => {
    const set = subscribers.get(key);
    if (set) for (const cb of set) cb();
  };
  const apply = (key: string, value: unknown) => {
    hydrated.add(key);
    if (value === undefined) cache.delete(key);
    else cache.set(key, value);
    notify(key);
  };

  adapter?.subscribeExternal?.((key, value) => apply(key, value));

  return {
    getItem<T>(key: string): T | undefined {
      if (!hydrated.has(key) && adapter) {
        hydrated.add(key);
        const persisted = adapter.getItem(key);
        if (persisted !== undefined) cache.set(key, persisted);
      }
      return cache.get(key) as T | undefined;
    },
    setItem<T>(key: string, value: T): void {
      hydrated.add(key);
      if (Object.is(cache.get(key), value)) return;
      cache.set(key, value);
      adapter?.setItem(key, value);
      notify(key);
    },
    removeItem(key: string): void {
      hydrated.add(key);
      cache.delete(key);
      adapter?.removeItem(key);
      notify(key);
    },
    subscribe(key: string, callback: () => void): () => void {
      let set = subscribers.get(key);
      if (!set) {
        set = new Set();
        subscribers.set(key, set);
      }
      set.add(callback);
      return () => {
        set.delete(callback);
        if (set.size === 0) subscribers.delete(key);
      };
    },
    keys(): string[] {
      return [...cache.keys()];
    },
  };
}
