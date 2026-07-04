/**
 * `useEvent(fn)` — a stable-identity callback that always invokes the LATEST
 * `fn`. Parity with ra-core's `useEvent` (itself the community "useEvent"
 * pattern from the React RFC / facebook/react#14099).
 *
 * The returned function's identity is fixed for the component's lifetime (a
 * `useCallback` with an empty dep list), so it is safe to pass to memoized
 * children or effect deps without retriggering them — yet each invocation runs
 * the current render's closure, read from a ref updated in a layout effect.
 *
 * Calling the returned function DURING render (before the layout effect has
 * assigned the ref) throws — an event handler must not run while rendering.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// Use useLayoutEffect in the browser; fall back to useEffect on the server,
// where useLayoutEffect warns (parity with ra-core's SSR guard).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useEvent<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
): (...args: Args) => Return {
  const ref = useRef<(...args: Args) => Return>(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });

  useIsomorphicLayoutEffect(() => {
    ref.current = fn;
  });

  return useCallback((...args: Args) => ref.current(...args), []);
}
