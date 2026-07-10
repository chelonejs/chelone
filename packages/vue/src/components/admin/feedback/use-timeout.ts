/**
 * `useTimeout` — the Vue twin of `@chelone/react`'s compat `useTimeout`. Returns
 * a `Ref<boolean>` that flips `true` `delay` ms after mount, then clears the
 * timer on scope disposal. Consumed by `<Loading>` / `<LinearProgress>` so a
 * fast response never flashes the indicator.
 *
 * Idiom translation: React arms the timer in a `useEffect` and stores the flag
 * in `useState`; Vue arms it in the composable body (setup phase) against a
 * `ref`, and releases via `onScopeDispose` — the same acquire-on-mount /
 * release-on-unmount lifecycle without a separate effect.
 */

import { onScopeDispose, type Ref, ref } from "vue";

/** A boolean ref that becomes `true` `delay` ms after the owning scope mounts. */
export function useTimeout(delay = 0): Ref<boolean> {
  const ready = ref(false);
  const timer = setTimeout(() => {
    ready.value = true;
  }, delay);
  onScopeDispose(() => clearTimeout(timer));
  return ready;
}
