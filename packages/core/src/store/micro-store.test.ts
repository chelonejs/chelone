import { describe, expect, it, vi } from "vitest";
import { createMicroStore, type MicroStore } from "./micro-store";

describe("createMicroStore", () => {
  it("getSnapshot is reference-stable until setState", () => {
    const store = createMicroStore<{ page: number; sort: string[] }>({
      page: 1,
      sort: [],
    });
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

  describe("subscription lifecycle (onSubscribed)", () => {
    it("attaches on the FIRST subscriber only; tears down on the LAST unsubscribe only", () => {
      const teardown = vi.fn();
      const onSubscribed = vi.fn(() => teardown);
      const store = createMicroStore({ n: 1 }, { onSubscribed });
      expect(onSubscribed).not.toHaveBeenCalled(); // construction is inert
      const unsubA = store.subscribe(() => {});
      expect(onSubscribed).toHaveBeenCalledTimes(1);
      const unsubB = store.subscribe(() => {});
      expect(onSubscribed).toHaveBeenCalledTimes(1); // second subscriber: no re-attach
      unsubA();
      expect(teardown).not.toHaveBeenCalled(); // one subscriber remains
      unsubB();
      expect(teardown).toHaveBeenCalledTimes(1); // last unsubscribe detaches
    });

    it("re-subscription after detach re-invokes onSubscribed (StrictMode sub/unsub/sub)", () => {
      const teardown = vi.fn();
      const onSubscribed = vi.fn(() => teardown);
      const store = createMicroStore({ n: 1 }, { onSubscribed });
      const unsub1 = store.subscribe(() => {});
      unsub1();
      store.subscribe(() => {});
      // attach runs twice total, teardown exactly once in between
      expect(onSubscribed).toHaveBeenCalledTimes(2);
      expect(teardown).toHaveBeenCalledTimes(1);
    });

    it("destroy while ATTACHED runs the teardown once in addition to onDestroy cleanups", () => {
      const teardown = vi.fn();
      const cleanup = vi.fn();
      const store = createMicroStore(
        { n: 1 },
        { onSubscribed: () => teardown },
      );
      store.onDestroy(cleanup);
      store.subscribe(() => {});
      store.destroy();
      store.destroy(); // idempotent — teardown must not re-run
      expect(teardown).toHaveBeenCalledTimes(1);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("destroy while DETACHED does not re-run the stale teardown", () => {
      const teardown = vi.fn();
      const store = createMicroStore(
        { n: 1 },
        { onSubscribed: () => teardown },
      );
      const unsub = store.subscribe(() => {});
      unsub(); // detach ran the teardown
      expect(teardown).toHaveBeenCalledTimes(1);
      store.destroy();
      expect(teardown).toHaveBeenCalledTimes(1); // not re-run
    });

    it("double-invoking one unsubscribe keeps the count exact (no premature detach)", () => {
      const teardown = vi.fn();
      const onSubscribed = vi.fn(() => teardown);
      const store = createMicroStore({ n: 1 }, { onSubscribed });
      const unsubA = store.subscribe(() => {});
      const unsubB = store.subscribe(() => {});
      unsubA();
      unsubA(); // idempotent — must NOT count as B's unsubscribe
      expect(teardown).not.toHaveBeenCalled();
      unsubB();
      expect(teardown).toHaveBeenCalledTimes(1);
      expect(onSubscribed).toHaveBeenCalledTimes(1);
    });

    it("setState works while detached (params changeable pre-attach)", () => {
      const store = createMicroStore({ n: 1 }, { onSubscribed: () => {} });
      store.setState({ n: 2 });
      expect(store.getSnapshot().n).toBe(2);
    });

    it("onSubscribed may return void — detach and destroy stay safe", () => {
      const onSubscribed = vi.fn(() => undefined);
      const store = createMicroStore({ n: 1 }, { onSubscribed });
      const unsub = store.subscribe(() => {});
      unsub();
      store.subscribe(() => {});
      store.destroy();
      expect(onSubscribed).toHaveBeenCalledTimes(2);
    });

    it("subscribe after destroy never attaches and returns a harmless no-op", () => {
      const onSubscribed = vi.fn(() => vi.fn());
      const store = createMicroStore({ n: 1 }, { onSubscribed });
      store.destroy();
      const unsub = store.subscribe(() => {});
      expect(onSubscribed).not.toHaveBeenCalled();
      expect(() => unsub()).not.toThrow();
    });

    it("an attach-time setState notifies the subscriber that triggered the attach", () => {
      // useSyncExternalStore checks the snapshot BEFORE subscribing; a sync
      // emitted DURING subscribe() must reach the new subscriber or it is lost.
      const store: MicroStore<{ n: number }> = createMicroStore(
        { n: 1 },
        { onSubscribed: () => store.setState({ n: 2 }) },
      );
      const cb = vi.fn();
      store.subscribe(cb);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot().n).toBe(2);
    });
  });
});
