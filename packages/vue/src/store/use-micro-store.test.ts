import { createMicroStore, type MicroStore } from "@chelone/core";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, type Ref, watch } from "vue";
import { useMicroStore, useMicroStoreSelector } from "./use-micro-store";

interface CounterState {
  count: number;
  label: string;
}

/**
 * Build a MicroStore with spies wired into the 4R acquire/release seam. The
 * acquire spy fires on the 0->1 subscriber transition (onSubscribed); the
 * release spy is the teardown it returns, fired when the count returns to 0.
 */
function makeStore(initial: CounterState): {
  store: MicroStore<CounterState>;
  acquire: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
} {
  const release = vi.fn();
  const acquire = vi.fn(() => release);
  const store = createMicroStore<CounterState>(initial, {
    onSubscribed: acquire,
  });
  return { store, acquire, release };
}

describe("useMicroStore — MicroStore reactivity bridge", () => {
  it("(a) first subscribe fires onSubscribed (4R acquire)", () => {
    const { store, acquire } = makeStore({ count: 0, label: "a" });
    const scope = effectScope();
    scope.run(() => {
      const state = useMicroStore(store);
      expect(state.value).toEqual({ count: 0, label: "a" });
    });
    // Bridge subscribed on setup -> 0->1 transition -> acquire ran exactly once.
    expect(acquire).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it("(b) onScopeDispose runs the release on effectScope().stop() (4R release)", () => {
    const { store, acquire, release } = makeStore({ count: 0, label: "a" });
    const scope = effectScope();
    scope.run(() => {
      useMicroStore(store);
    });
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    // Scope disposal -> onScopeDispose -> unsubscribe -> count 1->0 -> detach.
    scope.stop();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("(c) a store mutation propagates to the ref", async () => {
    const { store } = makeStore({ count: 0, label: "a" });
    const scope = effectScope();
    let state!: Readonly<Ref<CounterState>>;
    scope.run(() => {
      state = useMicroStore(store);
    });
    expect(state.value.count).toBe(0);

    store.setState({ count: 5 });
    expect(state.value.count).toBe(5);
    expect(state.value.label).toBe("a");

    // And it drives Vue reactivity (a watcher fires on the change).
    const seen: number[] = [];
    const watchScope = effectScope();
    watchScope.run(() => {
      watch(state, (s) => seen.push(s.count));
    });
    store.setState({ count: 9 });
    await nextTick();
    expect(seen).toEqual([9]);
    watchScope.stop();
    scope.stop();
  });

  it("(d) selector only re-emits on selected-slice change (shallow-equal guard)", async () => {
    const { store } = makeStore({ count: 0, label: "a" });
    const scope = effectScope();
    const seen: number[] = [];
    scope.run(() => {
      const count = useMicroStoreSelector(store, (s) => s.count);
      watch(count, (c) => seen.push(c));
    });

    // Mutating an unselected slice must NOT re-emit the selected value.
    store.setState({ label: "b" });
    await nextTick();
    expect(seen).toEqual([]);

    // Mutating the selected slice re-emits.
    store.setState({ count: 1 });
    await nextTick();
    expect(seen).toEqual([1]);

    // A no-op setState (same value) must not re-emit either.
    store.setState({ count: 1 });
    await nextTick();
    expect(seen).toEqual([1]);

    scope.stop();
  });

  it("(d') object-slice selector guards with shallow equality", async () => {
    const store = createMicroStore<CounterState>({ count: 0, label: "a" });
    const scope = effectScope();
    const emissions: Array<{ count: number }> = [];
    scope.run(() => {
      const slice = useMicroStoreSelector(store, (s) => ({ count: s.count }));
      watch(slice, (v) => emissions.push(v));
    });

    // label change -> selected object shallow-equal -> no re-emit.
    store.setState({ label: "z" });
    await nextTick();
    expect(emissions).toEqual([]);

    store.setState({ count: 3 });
    await nextTick();
    expect(emissions).toEqual([{ count: 3 }]);

    scope.stop();
  });

  it("(b') release fires once even across acquire/detach re-entry", () => {
    const { store, acquire, release } = makeStore({ count: 0, label: "a" });
    const first = effectScope();
    first.run(() => useMicroStore(store));
    first.stop();
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);

    // Re-subscribe after detach re-invokes acquire (attach/detach re-entry).
    const second = effectScope();
    second.run(() => useMicroStore(store));
    expect(acquire).toHaveBeenCalledTimes(2);
    second.stop();
    expect(release).toHaveBeenCalledTimes(2);
  });
});
