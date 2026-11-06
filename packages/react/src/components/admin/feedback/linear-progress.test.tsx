/**
 * P7g tests: `<LinearProgress>` — the delayed loading bar for form fields.
 *
 * Asserts: renders a placeholder span before the delay, an indeterminate bar
 * after it, and a determinate bar at `(value/max)*100%` width when `value` is
 * provided.
 */

import { elementOf } from "@chelone/test-utils";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinearProgress } from "./linear-progress";

describe("<LinearProgress>", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders a placeholder span before the delay", () => {
    const { container } = render(<LinearProgress timeout={1000} />);
    // Before the timeout: just a spacer span, no progress bar.
    expect(container.querySelector("span")).toBeTruthy();
    expect(container.querySelector("div")).toBeNull();
  });

  it("renders an indeterminate bar after the delay", () => {
    const { container } = render(<LinearProgress timeout={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const bar = container.querySelector("div");
    expect(bar).toBeTruthy();
    // The indeterminate inner element pulses (no explicit width style).
    expect(bar?.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders a determinate bar at value/max width", () => {
    const { container } = render(
      <LinearProgress timeout={1000} value={25} max={50} />,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const inner = elementOf(
      container.querySelector("[style*='width']"),
      HTMLElement,
    );
    expect(inner).toBeTruthy();
    expect(inner.style.width).toBe("50%");
  });
});
