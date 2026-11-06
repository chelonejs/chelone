import { describe, expect, it } from "vitest";
import type { JsonValue } from "../guards";
import { deepEqual } from "./deep-equal";

/** Two values of one type, so a mismatch here is a runtime question, not a type error. */
function pair(a: JsonValue, b: JsonValue): [JsonValue, JsonValue] {
  return [a, b];
}

describe("deepEqual", () => {
  it("compares plain objects by content whatever the key order", () => {
    expect(
      deepEqual(
        {
          type: "Feature",
          properties: null,
          geometry: { type: "Point", coordinates: [1, 2] },
        },
        {
          geometry: { coordinates: [1, 2], type: "Point" },
          properties: null,
          type: "Feature",
        },
      ),
    ).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    // `null` as a prototype is still an object a caller could have written.
    const bare: Record<string, number> = Object.create(null);
    bare.a = 1;
    expect(deepEqual(bare, { a: 1 })).toBe(true);
  });

  it("ignores a key whose value is undefined", () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: undefined }, {})).toBe(true);
    expect(
      deepEqual({ nested: { a: 1, b: undefined } }, { nested: { a: 1 } }),
    ).toBe(true);
    expect(deepEqual({ a: undefined }, { a: 1 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: undefined })).toBe(false);
  });

  it("compares arrays by order and length", () => {
    expect(deepEqual([1, 2], [1, 2])).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([[1, [2]]], [[1, [2]]])).toBe(true);
    expect(deepEqual([[1, [2]]], [[1, [3]]])).toBe(false);
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(deepEqual([null, 1], [null, 1])).toBe(true);
    const [asArray, asObject] = pair([1], { 0: 1 });
    expect(deepEqual(asArray, asObject)).toBe(false);
  });

  it("treats a Date or a class instance as equal to itself only", () => {
    const date = new Date(0);
    expect(deepEqual(date, date)).toBe(true);
    expect(deepEqual(date, new Date(0))).toBe(false);

    class Point {
      constructor(public x: number) {}
    }
    const point = new Point(1);
    expect(deepEqual(point, point)).toBe(true);
    expect(deepEqual(point, new Point(1))).toBe(false);

    const map = new Map([["a", 1]]);
    expect(deepEqual(map, map)).toBe(true);
    expect(deepEqual(map, new Map([["a", 1]]))).toBe(false);
    // A plain object holding one is compared by its keys, and the Date inside
    // it is still itself only.
    expect(deepEqual({ at: date }, { at: date })).toBe(true);
    expect(deepEqual({ at: date }, { at: new Date(0) })).toBe(false);
  });

  it("compares primitives by identity", () => {
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
    const [one, letter] = pair(1, "a");
    expect(deepEqual(one, letter)).toBe(false);
  });
});
