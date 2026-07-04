/**
 * P7g tests: `useTimeout` — the deferred-boolean hook backing the loading UI.
 *
 * Asserts: starts `false`, flips to `true` after `delay` ms, and re-arms
 * (returns to `false`, then `true`) when a dependency changes.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimeout } from "./compat-hooks";

describe("useTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts false and flips to true after the delay", () => {
    const { result } = renderHook(() => useTimeout(1000));
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it("re-arms when a dependency changes", () => {
    let dep = "a";
    const { result, rerender } = renderHook(() => useTimeout(500, [dep]));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(true);
    // Change the dep — the timer restarts, so it goes back to false.
    dep = "b";
    rerender();
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(true);
  });
});
