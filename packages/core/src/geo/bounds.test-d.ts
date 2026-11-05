import { describe, expectTypeOf, it } from "vitest";
import { geoBounds, isLngLatBox, type LngLatBox } from "./bounds";

describe("geoBounds", () => {
  it("returns a four-number box or null", () => {
    expectTypeOf(
      geoBounds({ type: "Point", coordinates: [0, 0] }),
    ).toEqualTypeOf<LngLatBox | null>();
  });
});

describe("isLngLatBox", () => {
  it("narrows a nullable number array to LngLatBox", () => {
    const narrow = (box: readonly number[] | null) => {
      if (isLngLatBox(box)) expectTypeOf(box).toEqualTypeOf<LngLatBox>();
    };
    narrow(null);
  });
});
