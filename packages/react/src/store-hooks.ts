import { useCallback, useSyncExternalStore } from "react";
import { useCheloneStore } from "./context";

/**
 * Subscribe to a single store key. Per-key notification means writes to other
 * keys never re-render this consumer; `store.getItem` is reference-stable
 * until the value changes, so the snapshot satisfies useSyncExternalStore.
 * Server snapshot returns `defaultValue` (no store reads during SSR).
 */
export function useStoreItem<T>(
  key: string,
  defaultValue?: T,
): [T | undefined, (value: T) => void] {
  const store = useCheloneStore();
  const value = useSyncExternalStore(
    useCallback((cb: () => void) => store.subscribe(key, cb), [store, key]),
    () => store.getItem<T>(key) ?? defaultValue,
    () => defaultValue,
  );
  const setValue = useCallback(
    (next: T) => store.setItem(key, next),
    [store, key],
  );
  return [value, setValue];
}

/**
 * ra-parity alias of {@link useStoreItem}. shadmin components import
 * `useStore(key, defaultValue) -> [value, setter]` (30 call sites); chelone's
 * store hook is the identically-shaped `useStoreItem`. This is the SAME
 * function value — no wrapper, so no behavioral drift and no re-render cost.
 */
export const useStore = useStoreItem;
