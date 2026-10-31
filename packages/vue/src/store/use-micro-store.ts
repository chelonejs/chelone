import type { MicroStore } from "@chelone/core";
import {
  type ComputedRef,
  computed,
  onScopeDispose,
  type Ref,
  shallowRef,
} from "vue";

/**
 * Vue reactivity bridge for Chelone's `MicroStore<T>` — the single subscribe
 * seam that lets a Vue adapter drive the *unchanged* core controllers. This is
 * the Vue analog of React's `useSyncExternalStore(subscribe, getSnapshot)`.
 *
 * The 4R (acquire/release) lifecycle maps 1:1 onto Vue's effect scope:
 * - **acquire** — the first `store.subscribe()` flips the store's subscriber
 *   count 0->1, firing its `onSubscribed` (the controller attaches its
 *   QueryObserver / KV subscriptions). Because the bridge subscribes during
 *   `setup`, mounting a component that reads a controller acquires its
 *   resources exactly as React's commit-phase subscribe does.
 * - **release** — `onScopeDispose(unsubscribe)` runs when the owning effect
 *   scope tears down (component unmount, or `effectScope().stop()` in tests).
 *   The unsubscribe flips the count back to 0, firing the `onSubscribed`
 *   teardown (detach). Vue's scope disposal replaces React's
 *   `useSyncExternalStore` teardown; there is no separate `destroy()` on the
 *   render path (mirrors the React twin's deliberate no-destroy-effect rule).
 *
 * The snapshot is held in a `shallowRef` — the whole object swaps on each
 * mutation (core guarantees snapshot stability: same reference until
 * `setState`), so a shallow ref is the right granularity and avoids deep-
 * proxying controller state. The returned `computed` view is genuinely
 * read-only (no cast) and does not re-proxy the snapshot.
 */
export function useMicroStore<T>(store: MicroStore<T>): Readonly<Ref<T>> {
  const state = shallowRef<T>(store.getSnapshot());
  const unsubscribe = store.subscribe(() => {
    state.value = store.getSnapshot();
  });
  onScopeDispose(unsubscribe);
  return computed(() => state.value);
}

/** Shallow structural equality: `Object.is` on primitives, one-level key/value on objects. */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (
      !Object.hasOwn(bRecord, key) ||
      !Object.is(aRecord[key], bRecord[key])
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Selector variant of {@link useMicroStore}: subscribe to `store`, project each
 * snapshot through `selector`, and only re-emit when the *selected slice*
 * changes under shallow equality. This is the Vue analog of React's
 * `useSyncExternalStoreWithSelector` — it lets a component depend on one field
 * (or a small derived object) and skip re-renders when unrelated slices mutate.
 *
 * A plain `computed(() => selector(state.value))` cannot do this: a selector
 * returning a fresh object each call is `!==` its predecessor, so Vue would
 * propagate on every store mutation. The shallow-equal guard below holds the
 * previous slice and only reassigns the backing ref when the projection
 * actually differs — so downstream watchers/renders fire solely on slice change.
 * The 4R acquire/release maps to scope disposal exactly as in {@link useMicroStore}.
 */
export function useMicroStoreSelector<T, S>(
  store: MicroStore<T>,
  selector: (state: T) => S,
): ComputedRef<S> {
  const selected = shallowRef<S>(selector(store.getSnapshot()));
  const unsubscribe = store.subscribe(() => {
    const next = selector(store.getSnapshot());
    if (!shallowEqual(selected.value, next)) {
      selected.value = next;
    }
  });
  onScopeDispose(unsubscribe);
  return computed(() => selected.value);
}
