import { describe, expect, it } from "vitest";
import { shallowEqual } from "./shallow-equal";

const shared = { x: 1 };
const same = { a: 1 };

describe("shallowEqual", () => {
  it.each([
    ["the same reference", same, same, true],
    ["NaN with NaN", Number.NaN, Number.NaN, true],
    ["NaN inside flat objects", { a: Number.NaN }, { a: Number.NaN }, true],
    ["0 with -0", 0, -0, false],
    ["0 with -0 inside flat objects", { a: 0 }, { a: -0 }, false],
    ["differing numbers", 1, 2, false],
    ["differing strings", "a", "b", false],
    ["null against {}", null, {}, false],
    ["{} against null", {}, null, false],
    ["equal flat objects", { a: 1, b: 2 }, { a: 1, b: 2 }, true],
    ["a differing value", { a: 1, b: 2 }, { a: 1, b: 3 }, false],
    ["a differing key count", { a: 1 }, { a: 1, b: 2 }, false],
    ["same count with different keys", { a: 1 }, { b: 1 }, false],
    ["the same nested reference", { a: shared }, { a: shared }, true],
    ["equal nested copies", { a: { x: 1 } }, { a: { x: 1 } }, false],
    ["equal arrays", [1, 2, 3], [1, 2, 3], true],
    ["arrays with a differing item", [1, 2, 3], [1, 2, 4], false],
    ["arrays of differing length", [1, 2], [1, 2, 3], false],
  ])("%s: equal is %s", (_name, a, b, expected) => {
    expect(shallowEqual(a, b)).toBe(expected);
  });

  it("{ x: undefined } and { y: 1 } are not equal", () => {
    expect(shallowEqual({ x: undefined }, { y: 1 })).toBe(false);
  });
});
