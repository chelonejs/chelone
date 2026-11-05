import type { CSSProperties } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { cssVars } from "./css-vars";

describe("cssVars", () => {
  it("accepts custom properties next to standard ones", () => {
    expectTypeOf(
      cssVars({ "--gap": 2, color: "red" }),
    ).toEqualTypeOf<CSSProperties>();
  });

  it("rejects a custom property without the double dash", () => {
    // @ts-expect-error a custom property starts with `--`
    cssVars({ "-gap": 2 });
  });

  it("rejects a custom property value that is not a string or number", () => {
    // @ts-expect-error values are strings or numbers
    cssVars({ "--gap": true });
  });
});
