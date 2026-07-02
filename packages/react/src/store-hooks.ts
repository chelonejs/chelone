import { useCallback, useSyncExternalStore } from "react";
import { useChelonStore } from "./context";

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
  const store = useChelonStore();
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
