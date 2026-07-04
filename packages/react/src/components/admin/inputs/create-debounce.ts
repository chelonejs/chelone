/**
 * A minimal trailing-edge debounce used by the autocomplete inputs to throttle
 * server-side filtering (`setFilters`). Replaces `lodash/debounce` so the choice
 * inputs add no runtime dependency: the autocompletes only need the trailing
 * call plus a `.cancel()` to drop an in-flight call on unmount / external reset.
 */
export interface DebouncedFn<Args extends unknown[]> {
  (...args: Args): void;
  /** Cancel a pending trailing call. */
  cancel(): void;
}

export function createDebounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): DebouncedFn<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return debounced;
}
