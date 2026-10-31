import { afterEach, describe, expect, it, vi } from "vitest";
import { createOfflineStore } from "./offline-store";

/** A window double that records listeners and can dispatch to them. */
function stubWindow() {
  const listeners = new Map<string, Set<() => void>>();
  const addEventListener = vi.fn((type: string, listener: () => void) => {
    const set = listeners.get(type) ?? new Set<() => void>();
    set.add(listener);
    listeners.set(type, set);
  });
  const removeEventListener = vi.fn((type: string, listener: () => void) => {
    listeners.get(type)?.delete(listener);
  });
  vi.stubGlobal("window", { addEventListener, removeEventListener });
  return {
    addEventListener,
    removeEventListener,
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
    dispatch: (type: string) => {
      for (const listener of listeners.get(type) ?? []) listener();
    },
  };
}

describe("createOfflineStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts offline when navigator.onLine is false", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(createOfflineStore().getSnapshot()).toEqual({ isOffline: true });
  });

  it("reports online when there is no navigator", () => {
    vi.stubGlobal("navigator", undefined);
    expect(createOfflineStore().getSnapshot()).toEqual({ isOffline: false });
  });

  it("follows the offline and online events while subscribed", () => {
    const navigator = { onLine: true };
    vi.stubGlobal("navigator", navigator);
    const win = stubWindow();
    const store = createOfflineStore();
    const callback = vi.fn();
    store.subscribe(callback);

    win.dispatch("offline");
    expect(store.getSnapshot()).toEqual({ isOffline: true });
    win.dispatch("online");
    expect(store.getSnapshot()).toEqual({ isOffline: false });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("re-reads navigator.onLine when the first subscriber attaches", () => {
    const navigator = { onLine: true };
    vi.stubGlobal("navigator", navigator);
    stubWindow();
    const store = createOfflineStore();
    navigator.onLine = false;
    store.subscribe(() => {});
    expect(store.getSnapshot()).toEqual({ isOffline: true });
  });

  it("adds no window listener until subscribed and removes them on unsubscribe", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const win = stubWindow();
    const store = createOfflineStore();
    expect(win.addEventListener).not.toHaveBeenCalled();

    const unsubscribe = store.subscribe(() => {});
    expect(win.count()).toBe(2);

    unsubscribe();
    expect(win.count()).toBe(0);
    win.dispatch("offline");
    expect(store.getSnapshot()).toEqual({ isOffline: false });
  });
});
