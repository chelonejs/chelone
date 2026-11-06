import { describe, expect, it } from "vitest";
import { identifiersOf, isIdentifier, isIdentifierArray } from "./identifier";

describe("isIdentifier", () => {
  it("accepts a string id and a number id", () => {
    expect(isIdentifier("a-1")).toBe(true);
    expect(isIdentifier(7)).toBe(true);
  });

  it("rejects null, undefined, a boolean, an array and an object", () => {
    expect(isIdentifier(null)).toBe(false);
    expect(isIdentifier(undefined)).toBe(false);
    expect(isIdentifier(true)).toBe(false);
    expect(isIdentifier(["a"])).toBe(false);
    expect(isIdentifier({ id: 1 })).toBe(false);
  });
});

describe("isIdentifierArray", () => {
  it("accepts an array mixing string and number ids", () => {
    expect(isIdentifierArray(["a", 2, "b"])).toBe(true);
  });

  it("rejects an array with a member that is not an id", () => {
    expect(isIdentifierArray(["a", null])).toBe(false);
    expect(isIdentifierArray([1, { id: 2 }])).toBe(false);
  });

  it("rejects a value that is not an array", () => {
    expect(isIdentifierArray("a,2")).toBe(false);
    expect(isIdentifierArray(null)).toBe(false);
  });
});

describe("identifiersOf", () => {
  it("returns an array of ids as it is", () => {
    const ids = [1, "a"];
    expect(identifiersOf(ids)).toBe(ids);
  });

  it("keeps the id members of a partially valid array", () => {
    // A nullable Postgres int[] reads as nulls between its ids.
    expect(identifiersOf([1, null, 2])).toEqual([1, 2]);
    expect(identifiersOf([1, { id: 2 }, "a"])).toEqual([1, "a"]);
  });

  it("returns an empty list for a value that is not an array", () => {
    expect(identifiersOf("1,2")).toEqual([]);
    expect(identifiersOf(undefined)).toEqual([]);
  });
});
