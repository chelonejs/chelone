/**
 * `shallowEqual(a, b)` — shallow object/array equality with `Object.is`
 * semantics at the top level. Parity with ra-core's `shallowEqual`.
 *
 * Contract:
 * - reference-equal inputs are equal (fast path);
 * - `+0` / `-0` are NOT equal (Object.is), `NaN` / `NaN` ARE equal;
 * - non-objects (or null) that aren't reference-equal are unequal;
 * - objects with the same keys and `Object.is`-equal values are equal;
 * - differing key count, differing keys, or one differing value → unequal;
 * - nested objects are compared by reference only (shallow).
 */

import { describe, expect, it } from "vitest";
import { shallowEqual } from "./shallow-equal";

describe("shallowEqual", () => {
  it("returns true for reference-equal inputs", () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it("treats NaN as equal to NaN", () => {
    expect(shallowEqual(NaN, NaN)).toBe(true);
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it("treats +0 and -0 as NOT equal (Object.is)", () => {
    expect(shallowEqual(0, -0)).toBe(false);
    expect(shallowEqual({ a: 0 }, { a: -0 })).toBe(false);
  });

  it("returns false for unequal primitives", () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual("a", "b")).toBe(false);
  });

  it("returns false when one side is null and the other is an object", () => {
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
  });

  it("returns true for the same key/value pairs", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns false for a differing value", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it("returns false for a differing key count", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("returns false for the same count but different keys", () => {
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("compares nested objects by reference only (shallow)", () => {
    const shared = { x: 1 };
    expect(shallowEqual({ a: shared }, { a: shared })).toBe(true);
    expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
  });

  it("compares arrays element-wise (shallow)", () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });
});
