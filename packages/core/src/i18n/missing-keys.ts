export interface MissingKeyEntry {
  key: string;
  fallback: string | undefined;
  translation: string;
}

export interface MissingKeyStore {
  /** Has the `onMissingKey` signature: pass it as `onMissingKey: store.record`. */
  record(key: string, locale: string, fallback: string | undefined): void;
  /** The same array until that locale's entries change. */
  getEntries(locale: string): readonly MissingKeyEntry[];
  /** Ignores a key that was not recorded. */
  setTranslation(locale: string, key: string, text: string): void;
  clear(locale: string): void;
  /** Flat `{ key: text }` JSON, two-space indented, non-blank translations only. */
  toJson(locale: string): string;
  /** Notified once per microtask, however many entries changed. */
  subscribe(callback: () => void): () => void;
}

const NO_ENTRIES: readonly MissingKeyEntry[] = [];

export function createMissingKeyStore(): MissingKeyStore {
  // A Map keeps `__proto__` an ordinary key; entries are replaced, never mutated.
  const byLocale = new Map<string, Map<string, MissingKeyEntry>>();
  const snapshots = new Map<string, readonly MissingKeyEntry[]>();
  const subscribers = new Set<() => void>();
  let scheduled = false;

  const changed = (locale: string) => {
    snapshots.delete(locale);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      for (const cb of [...subscribers]) cb();
    });
  };

  const getEntries = (locale: string): readonly MissingKeyEntry[] => {
    const cached = snapshots.get(locale);
    if (cached) return cached;
    const entries = byLocale.get(locale);
    if (!entries?.size) return NO_ENTRIES;
    const snapshot = [...entries.values()];
    snapshots.set(locale, snapshot);
    return snapshot;
  };

  return {
    record(key, locale, fallback) {
      let entries = byLocale.get(locale);
      if (!entries) {
        entries = new Map();
        byLocale.set(locale, entries);
      }
      if (entries.has(key)) return;
      entries.set(key, { key, fallback, translation: "" });
      changed(locale);
    },
    getEntries,
    setTranslation(locale, key, text) {
      const entries = byLocale.get(locale);
      const entry = entries?.get(key);
      if (!entries || !entry || entry.translation === text) return;
      entries.set(key, { ...entry, translation: text });
      changed(locale);
    },
    clear(locale) {
      if (!byLocale.get(locale)?.size) return;
      byLocale.delete(locale);
      changed(locale);
    },
    toJson(locale) {
      const out = new Map<string, string>();
      for (const { key, translation } of getEntries(locale)) {
        if (translation.trim() !== "") out.set(key, translation);
      }
      // fromEntries defines own properties, so `__proto__` survives.
      return JSON.stringify(Object.fromEntries(out), null, 2);
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => void subscribers.delete(callback);
    },
  };
}
