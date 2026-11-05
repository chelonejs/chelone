import { describe, expect, it } from "vitest";
import { definedParams, isTranslateParamValues } from "./messages";

describe("definedParams", () => {
  it("drops absent values so their placeholders stay unfilled", () => {
    expect(definedParams({ name: undefined, id: 3, _: "Edit" })).toEqual({
      id: 3,
      _: "Edit",
    });
  });
});

describe("isTranslateParamValues", () => {
  it("accepts string and number values only", () => {
    expect(isTranslateParamValues({ a: "x", b: 1 })).toBe(true);
    expect(isTranslateParamValues({ a: true })).toBe(false);
    expect(isTranslateParamValues({ a: {} })).toBe(false);
    expect(isTranslateParamValues(["x"])).toBe(false);
    expect(isTranslateParamValues(null)).toBe(false);
  });
});
