import { describe, expectTypeOf, it } from "vitest";
import { deepEqual } from "./deep-equal";

interface Shape {
  type: "Point";
  coordinates: [number, number];
}

describe("deepEqual types", () => {
  it("answers with a boolean", () => {
    expectTypeOf(deepEqual({ a: 1 }, { a: 1 })).toEqualTypeOf<boolean>();
  });

  it("refuses two arguments of unrelated types", () => {
    // @ts-expect-error "a" is not a number
    deepEqual(1, "a");
  });

  it("keeps the caller's own type for both arguments", () => {
    const drawn: Shape = { type: "Point", coordinates: [1, 2] };
    expectTypeOf(deepEqual(drawn, drawn)).toEqualTypeOf<boolean>();
    // @ts-expect-error a Shape is not a string
    deepEqual(drawn, "Point");
  });

  it("takes two members of one union", () => {
    const a: string | null = null;
    const b: string | null = "a";
    expectTypeOf(deepEqual(a, b)).toEqualTypeOf<boolean>();
  });
});
