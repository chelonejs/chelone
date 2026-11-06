/**
 * PATTERN GATE (V1-a) — the Vue reactivity bridge (`useMicroStore`) under churn.
 *
 * The bridge introduces a NEW lifecycle: `MicroStore.subscribe()` acquired in
 * `setup`, released via `onScopeDispose`. A subtle leak hides here — a scope
 * that stops without releasing its subscription, or a post-dispose store
 * mutation still writing a torn-down ref. These tests hammer the mount/unmount
 * (and nested-effectScope) path MANY times and assert exact acquire/release
 * balance against CORE's own subscriber bookkeeping — never a React assumption.
 *
 * Bookkeeping is read straight off core's real `createMicroStore`:
 *  - `acquire` (onSubscribed) fires on the true 0->1 subscriber transition,
 *  - its returned teardown (`release`) fires when the count returns to 0,
 *  - a `subscribe`-wrapping counter (`liveCount`) mirrors core's internal Set
 *    size, so "no leaked subscriptions" is a direct `liveCount === 0` assertion.
 */

import { createMicroStore, type MicroStore } from "@chelone/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h, type Ref } from "vue";
import { useMicroStore } from "./use-micro-store";

interface CounterState {
  count: number;
  label: string;
}

/**
 * A real core `MicroStore` with the 4R seam spied AND a live subscriber counter
 * wrapping `subscribe` — so the test reads core's ACTUAL bookkeeping (Set size,
 * onSubscribed 0->1 / teardown 1->0), not a re-implementation.
 */
function instrumentedStore(initial: CounterState): {
  store: MicroStore<CounterState>;
  acquire: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  /** Live count of outstanding subscriptions — mirrors core's internal Set. */
  live(): number;
} {
  const release = vi.fn();
  const acquire = vi.fn(() => release);
  const inner = createMicroStore<CounterState>(initial, {
    onSubscribed: acquire,
  });
  let liveCount = 0;
  const store: MicroStore<CounterState> = {
    ...inner,
    subscribe(callback) {
      const unsubscribe = inner.subscribe(callback);
      liveCount++;
      let undone = false;
      return () => {
        unsubscribe();
        // Idempotent — a double-unsubscribe must not double-decrement (parity
        // with core's own idempotent unsubscribe).
        if (!undone) {
          undone = true;
          liveCount--;
        }
      };
    },
  };
  return { store, acquire, release, live: () => liveCount };
}

describe("useMicroStore bridge — 4R lifecycle under churn (PATTERN GATE)", () => {
  it("(1) mount/unmount 200x via effectScope: acquire==release==200, live==0 throughout", () => {
    const { store, acquire, release, live } = instrumentedStore({
      count: 0,
      label: "a",
    });
    const CYCLES = 200;
    for (let i = 0; i < CYCLES; i++) {
      const scope = effectScope();
      scope.run(() => {
        useMicroStore(store);
      });
      // Exactly one live subscription while mounted; acquire fired once total
      // per fresh attach (0->1 each cycle since the prior cycle detached).
      expect(live()).toBe(1);
      expect(acquire).toHaveBeenCalledTimes(i + 1);
      scope.stop();
      // Scope disposal released the subscription — back to zero, no leak.
      expect(live()).toBe(0);
      expect(release).toHaveBeenCalledTimes(i + 1);
    }
    expect(acquire).toHaveBeenCalledTimes(CYCLES);
    expect(release).toHaveBeenCalledTimes(CYCLES);
    expect(live()).toBe(0);
  });

  it("(2) real component mount/unmount 100x: no leaked subscriptions", () => {
    const { store, acquire, release, live } = instrumentedStore({
      count: 0,
      label: "a",
    });
    const Consumer = defineComponent({
      setup() {
        const state = useMicroStore(store);
        return () => h("div", state.value.count);
      },
    });
    const CYCLES = 100;
    for (let i = 0; i < CYCLES; i++) {
      const wrapper = mount(Consumer);
      expect(live()).toBe(1);
      wrapper.unmount();
      expect(live()).toBe(0);
    }
    expect(acquire).toHaveBeenCalledTimes(CYCLES);
    expect(release).toHaveBeenCalledTimes(CYCLES);
    expect(live()).toBe(0);
  });

  it("(3) nested effectScopes: stopping the PARENT releases the child's subscription", () => {
    const { store, acquire, release, live } = instrumentedStore({
      count: 0,
      label: "a",
    });
    const parent = effectScope();
    parent.run(() => {
      // A child scope created inside the parent is owned by it; the bridge's
      // onScopeDispose registers on the INNERMOST active scope.
      const child = effectScope();
      child.run(() => {
        useMicroStore(store);
      });
      expect(live()).toBe(1);
      expect(acquire).toHaveBeenCalledTimes(1);
    });
    // Parent still running; child still active -> subscription still live.
    expect(live()).toBe(1);
    // Stopping the parent cascades to the child scope -> release runs.
    parent.stop();
    expect(release).toHaveBeenCalledTimes(1);
    expect(live()).toBe(0);
  });

  it("(4) deeply nested scopes churned 50x: full cascade release, zero leak", () => {
    const { store, release, live } = instrumentedStore({
      count: 0,
      label: "a",
    });
    for (let i = 0; i < 50; i++) {
      const outer = effectScope();
      outer.run(() => {
        const mid = effectScope();
        mid.run(() => {
          const inner = effectScope();
          inner.run(() => {
            useMicroStore(store);
            useMicroStore(store); // two subscriptions in the same leaf scope
          });
        });
      });
      expect(live()).toBe(2);
      outer.stop();
      expect(live()).toBe(0);
    }
    // `release` is core's EDGE-triggered teardown: two subscriptions per cycle
    // fire ONE acquire (0->1->2) and ONE release (2->1->0), so 50 cycles = 50
    // releases. The true leak check is `live()` — 2 while mounted, 0 after each
    // cascade stop, never accumulating.
    expect(release).toHaveBeenCalledTimes(50);
    expect(live()).toBe(0);
  });

  it("(5) post-unmount store mutation does NOT touch the disposed ref (no leak, no throw)", () => {
    const { store, release, live } = instrumentedStore({
      count: 0,
      label: "a",
    });
    const scope = effectScope();
    let state!: Readonly<Ref<CounterState>>;
    scope.run(() => {
      state = useMicroStore(store);
    });
    // Mutate while mounted — the ref tracks the store.
    store.setState({ count: 7 });
    expect(state.value.count).toBe(7);

    // Tear down: subscription released, count back to zero.
    scope.stop();
    expect(release).toHaveBeenCalledTimes(1);
    expect(live()).toBe(0);

    // A mutation AFTER disposal must not run the (unsubscribed) bridge callback
    // — the disposed ref stays frozen at its last value, and nothing throws.
    expect(() => store.setState({ count: 999 })).not.toThrow();
    expect(state.value.count).toBe(7);
    expect(live()).toBe(0);
  });

  it("(6) matches core bookkeeping: two concurrent subscribers -> ONE acquire, ONE release on the 0->1->0 edges", () => {
    const { store, acquire, release, live } = instrumentedStore({
      count: 0,
      label: "a",
    });
    const first = effectScope();
    const second = effectScope();
    first.run(() => useMicroStore(store));
    // Second subscriber does NOT re-acquire — core fires onSubscribed only on
    // the true 0->1 edge.
    second.run(() => useMicroStore(store));
    expect(live()).toBe(2);
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();

    // Dropping one subscriber does NOT detach — count is 2->1, not ->0.
    first.stop();
    expect(live()).toBe(1);
    expect(release).not.toHaveBeenCalled();

    // Dropping the last subscriber fires the single release (1->0 edge).
    second.stop();
    expect(live()).toBe(0);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
