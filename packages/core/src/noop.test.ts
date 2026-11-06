import { describe, expect, it } from "vitest";
import { noop } from "./noop";

describe("noop", () => {
  it("noop returns undefined and ignores its arguments", () => {
    const call: (...args: readonly number[]) => void = noop;
    expect(noop()).toBeUndefined();
    expect(call(1, 2, 3)).toBeUndefined();
  });
});
