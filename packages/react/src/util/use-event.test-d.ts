/**
 * `useEvent` type tests — the wrapped callback must preserve the argument
 * tuple and return type of the input function (parity with ra-core's
 * `<Args extends unknown[], Return>` signature).
 */

import { assertType, describe, it } from "vitest";
import { useEvent } from "./use-event";

describe("useEvent types", () => {
  it("preserves the argument tuple and return type", () => {
    const stable = useEvent((a: number, b: string): boolean => a > b.length);
    assertType<(a: number, b: string) => boolean>(stable);
  });

  it("preserves a zero-arg void callback", () => {
    const stable = useEvent(() => {});
    assertType<() => void>(stable);
  });

  it("preserves a rest-args signature", () => {
    const stable = useEvent((...nums: number[]) => nums.length);
    assertType<(...nums: number[]) => number>(stable);
  });
});
