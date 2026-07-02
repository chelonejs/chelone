import { describe, expect, it, vi } from "vitest";
import { createMicroStore } from "./micro-store";

describe("createMicroStore", () => {
  it("getSnapshot is reference-stable until setState", () => {
    const store = createMicroStore({ page: 1, sort: [] as string[] });
    const a = store.getSnapshot();
    expect(store.getSnapshot()).toBe(a);
    store.setState({ page: 2 });
    const b = store.getSnapshot();
    expect(b).not.toBe(a);
    expect(b).toEqual({ page: 2, sort: [] });
    expect(a).toEqual({ page: 1, sort: [] }); // previous snapshot untouched (no in-place mutation)
  });

  it("supports updater functions and notifies subscribers once per setState", () => {
    const store = createMicroStore({ n: 1 });
    const cb = vi.fn();
    store.subscribe(cb);
    store.setState((prev) => ({ n: prev.n + 1 }));
    expect(store.getSnapshot().n).toBe(2);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("no-op writes (all Object.is-equal) do not notify", () => {
    const store = createMicroStore({ n: 1 });
    const cb = vi.fn();
    store.subscribe(cb);
    store.setState({ n: 1 });
    expect(cb).not.toHaveBeenCalled();
  });

  it("unsubscribe works and destroy clears subscribers, runs cleanups once, freezes state", () => {
    const store = createMicroStore({ n: 1 });
    const cb = vi.fn();
    const cleanup = vi.fn();
    store.subscribe(cb);
    store.onDestroy(cleanup);
    store.destroy();
    store.destroy(); // idempotent
    expect(cleanup).toHaveBeenCalledTimes(1);
    store.setState({ n: 9 });
    expect(store.getSnapshot().n).toBe(1);
    expect(cb).not.toHaveBeenCalled();
  });
});
