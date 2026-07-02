import type { StoreAdapter } from "./store";

export function memoryStoreAdapter(
  initial: Record<string, unknown> = {},
): StoreAdapter {
  const map = new Map<string, unknown>(Object.entries(initial));
  return {
    getItem: (key) => map.get(key),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** window/localStorage touched ONLY inside method bodies — module import is SSR-safe. */
function storage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined; // storage blocked (privacy mode / sandbox)
  }
}

export function localStorageAdapter(
  options: { prefix?: string } = {},
): StoreAdapter {
  const prefix = options.prefix ?? "chelone.";
  return {
    getItem(key) {
      const raw = storage()?.getItem(prefix + key);
      if (raw == null) return undefined;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return undefined;
      }
    },
    setItem(key, value) {
      try {
        storage()?.setItem(prefix + key, JSON.stringify(value));
      } catch {
        // quota exceeded / serialization failure — preference writes are best-effort
      }
    },
    removeItem(key) {
      storage()?.removeItem(prefix + key);
    },
    subscribeExternal(onChange) {
      if (typeof window === "undefined") return () => {};
      const listener = (event: StorageEvent) => {
        if (!event.key?.startsWith(prefix)) return;
        const key = event.key.slice(prefix.length);
        if (event.newValue == null) {
          onChange(key, undefined);
          return;
        }
        try {
          onChange(key, JSON.parse(event.newValue) as unknown);
        } catch {
          // ignore corrupt cross-tab payloads
        }
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
  };
}
