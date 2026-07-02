import { describe, expect, it, vi } from "vitest";
import { createStore } from "./store";

describe("createStore", () => {
  it("set/get round-trips and getItem is reference-stable until changed", () => {
    const store = createStore();
    const value = { columns: ["a", "b"] };
    store.setItem("posts.list.columns", value);
    const first = store.getItem("posts.list.columns");
    const second = store.getItem("posts.list.columns");
    expect(first).toBe(second); // SAME reference — useSyncExternalStore requirement
    expect(first).toEqual(value);
  });

  it("notifies ONLY the touched key's subscribers", () => {
    const store = createStore();
    const onA = vi.fn();
    const onB = vi.fn();
    store.subscribe("a", onA);
    store.subscribe("b", onB);
    store.setItem("a", 1);
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).not.toHaveBeenCalled();
  });

  it("unsubscribe stops notifications", () => {
    const store = createStore();
    const cb = vi.fn();
    const unsub = store.subscribe("k", cb);
    unsub();
    store.setItem("k", 1);
    expect(cb).not.toHaveBeenCalled();
  });

  it("removeItem clears the value and notifies", () => {
    const store = createStore();
    const cb = vi.fn();
    store.setItem("k", 1);
    store.subscribe("k", cb);
    store.removeItem("k");
    expect(store.getItem("k")).toBeUndefined();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("hydrates lazily from the adapter on first getItem", () => {
    const backing = new Map<string, unknown>([["k", 42]]);
    const adapter = {
      getItem: (k: string) => backing.get(k),
      setItem: (k: string, v: unknown) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    };
    const store = createStore(adapter);
    expect(store.getItem("k")).toBe(42);
  });

  it("writes through to the adapter", () => {
    const setItem = vi.fn();
    const store = createStore({
      getItem: () => undefined,
      setItem,
      removeItem: () => {},
    });
    store.setItem("k", "v");
    expect(setItem).toHaveBeenCalledWith("k", "v");
  });

  it("applies adapter external changes (cross-tab) and notifies the key", () => {
    let emit!: (key: string, value: unknown) => void;
    const adapter = {
      getItem: () => undefined,
      setItem: () => {},
      removeItem: () => {},
      subscribeExternal: (onChange: (key: string, value: unknown) => void) => {
        emit = onChange;
        return () => {};
      },
    };
    const store = createStore(adapter);
    const cb = vi.fn();
    store.subscribe("k", cb);
    emit("k", "from-another-tab");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getItem("k")).toBe("from-another-tab");
  });

  it("setItem with an identical value (Object.is) does not notify", () => {
    const store = createStore();
    const cb = vi.fn();
    store.setItem("k", 1);
    store.subscribe("k", cb);
    store.setItem("k", 1);
    expect(cb).not.toHaveBeenCalled();
  });
});
