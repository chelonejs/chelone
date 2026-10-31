import { onScopeDispose, type Ref, shallowRef } from "vue";
import { useCheloneStore } from "../context";

/**
 * One key of the KV store as a ref and a setter, the Vue twin of React's
 * `useStoreItem`. It subscribes to its own key only, so writes to other keys
 * do not touch the ref.
 *
 * Divergence from the React twin: the value is a `Ref`. The key and default
 * are read once, in `setup`.
 */
export function useStoreItem<T>(
  key: string,
  defaultValue?: T,
): [Readonly<Ref<T | undefined>>, (value: T) => void] {
  const store = useCheloneStore();
  const read = () => store.getItem<T>(key) ?? defaultValue;
  const value = shallowRef<T | undefined>(read());
  onScopeDispose(
    store.subscribe(key, () => {
      value.value = read();
    }),
  );
  return [value, (next: T) => store.setItem(key, next)];
}

/** ra-parity alias of {@link useStoreItem}: the same function, not a wrapper. */
export const useStore = useStoreItem;
