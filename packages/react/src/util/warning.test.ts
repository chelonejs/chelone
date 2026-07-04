/**
 * `warning(condition, message)` — dev-only console warning helper. Parity with
 * ra-core's `warning`: logs `message` via `console.warn` when `condition` is
 * truthy AND `process.env.NODE_ENV !== "production"`; otherwise a no-op.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { warning } from "./warning";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("warning", () => {
  it("logs when the condition is truthy in a non-production env", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warning(true, "boom");
    expect(spy).toHaveBeenCalledWith("boom");
  });

  it("does nothing when the condition is falsy", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warning(false, "boom");
    expect(spy).not.toHaveBeenCalled();
  });

  it("does nothing in production even when the condition is truthy", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warning(true, "boom");
    expect(spy).not.toHaveBeenCalled();
  });
});
