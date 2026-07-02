// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localStorageAdapter, memoryStoreAdapter } from "./adapters";

/**
 * Node >= 22 defines an experimental `localStorage` accessor on globalThis
 * (it evaluates to undefined without `--localstorage-file`). Vitest's jsdom
 * environment skips global keys that already exist, so jsdom's REAL
 * localStorage gets shadowed by Node's undefined one. Shim a spec-shaped
 * Storage for this suite; guarded so environments where jsdom's own
 * localStorage survives keep testing the real thing.
 */
function storageShim(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

beforeEach(() => {
  if (window.localStorage === undefined) {
    vi.stubGlobal("localStorage", storageShim());
  }
});

describe("memoryStoreAdapter", () => {
  it("round-trips and seeds from initial", () => {
    const a = memoryStoreAdapter({ seeded: 1 });
    expect(a.getItem("seeded")).toBe(1);
    a.setItem("k", { x: 1 });
    expect(a.getItem("k")).toEqual({ x: 1 });
    a.removeItem("k");
    expect(a.getItem("k")).toBeUndefined();
  });
});

describe("localStorageAdapter", () => {
  it("persists JSON under the prefix", () => {
    const a = localStorageAdapter();
    a.setItem("sidebar.open", false);
    expect(window.localStorage.getItem("chelone.sidebar.open")).toBe("false");
    expect(a.getItem("sidebar.open")).toBe(false);
  });

  it("returns undefined for missing keys and survives corrupt JSON", () => {
    const a = localStorageAdapter();
    expect(a.getItem("nope")).toBeUndefined();
    window.localStorage.setItem("chelone.bad", "{not json");
    expect(a.getItem("bad")).toBeUndefined();
  });

  it("emits external changes from the storage event (cross-tab)", () => {
    const a = localStorageAdapter();
    const onChange = vi.fn();
    a.subscribeExternal?.(onChange);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "chelone.locale",
        newValue: JSON.stringify("fr"),
        // null, not window.localStorage: jsdom's webidl rejects the shim (it
        // is not a jsdom Storage instance), and the adapter never reads it.
        storageArea: null,
      }),
    );
    expect(onChange).toHaveBeenCalledWith("locale", "fr");
  });

  it("ignores storage events outside the prefix", () => {
    const a = localStorageAdapter();
    const onChange = vi.fn();
    a.subscribeExternal?.(onChange);
    window.dispatchEvent(
      new StorageEvent("storage", { key: "other.thing", newValue: '"x"' }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
