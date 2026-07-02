// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { localStorageAdapter, memoryStoreAdapter } from "./adapters";

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
        storageArea: window.localStorage,
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
