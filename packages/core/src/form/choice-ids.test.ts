import { describe, expect, it } from "vitest";
import { toIdentifierList } from "./choice-ids";

describe("toIdentifierList", () => {
  it("is empty for a scalar, which is not a list of ids", () => {
    expect(toIdentifierList("a")).toEqual([]);
    expect(toIdentifierList(7)).toEqual([]);
  });

  it("keeps an array of ids as it is", () => {
    const ids = ["a", 2, "c"];
    expect(toIdentifierList(ids)).toEqual(["a", 2, "c"]);
  });

  it("keeps the id members of a mixed array and skips the rest", () => {
    expect(toIdentifierList([1, null, "b", undefined, {}, [2], true])).toEqual([
      1,
      "b",
    ]);
  });

  it("is empty for null", () => {
    expect(toIdentifierList(null)).toEqual([]);
  });

  it("is empty for a scalar NaN, and keeps a NaN member because it is a number", () => {
    expect(toIdentifierList(Number.NaN)).toEqual([]);
    expect(toIdentifierList([Number.NaN, 1])).toEqual([Number.NaN, 1]);
  });
});
