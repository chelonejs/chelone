import { describe, expect, it } from "vitest";
import { definedParams, pickTranslateParamValues } from "./messages";

describe("definedParams", () => {
  it("drops absent values so their placeholders stay unfilled", () => {
    expect(definedParams({ name: undefined, id: 3, _: "Edit" })).toEqual({
      id: 3,
      _: "Edit",
    });
  });
});

describe("pickTranslateParamValues", () => {
  it("keeps the string and number entries and drops the rest", () => {
    expect(
      pickTranslateParamValues({
        min: 5,
        label: "x",
        strict: true,
        extra: undefined,
        nested: {},
      }),
    ).toEqual({ min: 5, label: "x" });
  });

  it("returns nothing for a value that is not a plain object", () => {
    expect(pickTranslateParamValues(["x"])).toBeUndefined();
    expect(pickTranslateParamValues(null)).toBeUndefined();
    expect(pickTranslateParamValues("x")).toBeUndefined();
  });
});
