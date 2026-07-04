/**
 * `useEvent(fn)` — ra-core's stable-callback util. Returns a referentially
 * STABLE function whose identity never changes across renders, but which always
 * invokes the LATEST `fn` passed in (a ref holding the current closure, updated
 * in a layout effect). Parity with ra-core's `useEvent`.
 *
 * Behaviors under test:
 * - the returned callback keeps a STABLE identity across re-renders;
 * - it always calls the CURRENT `fn` (latest closure / latest props), even
 *   though its identity did not change;
 * - it forwards arguments and returns the wrapped fn's return value;
 * - calling it during render (before the layout effect runs) throws the guard
 *   error rather than silently no-op'ing.
 */

import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEvent } from "./use-event";

afterEach(() => {
  cleanup();
});

describe("useEvent", () => {
  it("returns a referentially stable callback across re-renders", () => {
    const { result, rerender } = renderHook(
      ({ fn }: { fn: () => number }) => useEvent(fn),
      { initialProps: { fn: () => 1 } },
    );
    const first = result.current;
    rerender({ fn: () => 2 });
    expect(result.current).toBe(first);
  });

  it("invokes the latest fn even though its identity is stable", () => {
    const a = vi.fn(() => "a");
    const b = vi.fn(() => "b");
    const { result, rerender } = renderHook(
      ({ fn }: { fn: () => string }) => useEvent(fn),
      { initialProps: { fn: a } },
    );
    expect(result.current()).toBe("a");
    rerender({ fn: b });
    expect(result.current()).toBe("b");
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("forwards arguments and returns the wrapped fn's value", () => {
    const { result } = renderHook(() =>
      useEvent((x: number, y: number) => x + y),
    );
    expect(result.current(2, 3)).toBe(5);
  });

  it("reads the latest closed-over value, not a stale one", () => {
    let latest = "initial";
    const { result, rerender } = renderHook(() => useEvent(() => latest));
    latest = "updated";
    rerender();
    expect(result.current()).toBe("updated");
  });

  it("throws the guard error when called during render", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => {
      const handler = useEvent(() => "x");
      // call it during render, before the layout effect assigns the ref
      handler();
      return null;
    };
    expect(() => render(<Boom />)).toThrow(
      /Cannot call an event handler while rendering/,
    );
    spy.mockRestore();
  });
});
