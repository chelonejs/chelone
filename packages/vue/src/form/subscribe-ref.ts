/**
 * `useSubscribable` — the Vue reactivity bridge for form-core's own controllers
 * (`FormController` / `FieldBinding`). It is the SAME shallowRef + subscribe +
 * onScopeDispose pattern as the V1-a `useStore` (store/use-store.ts), narrowed
 * to the minimal readable shape form-core exposes.
 *
 * Why a sibling helper instead of reusing `useStore`:
 * - `useStore<T>` is typed to `MicroStore<T>`, which requires `getSnapshot` +
 *   `setState` + `subscribe` + `destroy` + `onDestroy`. The P4 record/list
 *   controllers are built on `createMicroStore`, so they satisfy it. The form
 *   controllers are NOT — a `FormController`/`FieldBinding` wraps a
 *   `@tanstack/form-core` store and exposes only the `useSyncExternalStore`
 *   contract (`subscribe` + `getSnapshot`), never `setState`/`onDestroy`. So
 *   they cannot be passed to `useStore` without a lie of a cast.
 * - Subscribing THROUGH the controller/binding is also load-bearing, not
 *   incidental: `FormController.subscribe` runs `form.mount()` on the 0->1
 *   transition (and unmounts on the last unsubscribe); `FieldBinding.subscribe`
 *   runs `field.mount()` (seeds the guarded default, registers the field so
 *   submit-time validation sees it). Bridging the raw form-core store directly
 *   (e.g. via `@tanstack/vue-store` over `form.store`) would read state but
 *   NEVER mount — validators would never attach. The 4R lifecycle lives on the
 *   controller's `subscribe`, so the bridge must go through it.
 *
 * Result: mounting a component that calls `useForm`/`useInput` acquires the
 * form/field (mount) during `setup`; `onScopeDispose` releases it (unmount) on
 * unmount or `effectScope().stop()` — the exact 4R mapping the V1-a bridge
 * proves, applied to the form-core seam.
 */

import { onScopeDispose, type Ref, shallowRef } from "vue";

/**
 * The minimal readable-store shape form-core's controllers expose — the
 * `useSyncExternalStore` contract. A `FormController` and a `FieldBinding` both
 * satisfy it structurally (each has extra members; excess is fine for a named
 * target type).
 */
export interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}

/**
 * Bridge a form-core `Subscribable<T>` into a Vue `shallowRef`. Subscribes on
 * `setup` (driving the 4R mount refcount) and releases on scope disposal. The
 * whole snapshot swaps on each mutation — form-core hands out a fresh, stable
 * state object per change, so a shallow ref is the right granularity; callers
 * derive fine-grained `computed`s off it.
 */
export function useSubscribable<T>(source: Subscribable<T>): Readonly<Ref<T>> {
  const state = shallowRef<T>(source.getSnapshot());
  const unsubscribe = source.subscribe(() => {
    state.value = source.getSnapshot();
  });
  onScopeDispose(unsubscribe);
  return state;
}
