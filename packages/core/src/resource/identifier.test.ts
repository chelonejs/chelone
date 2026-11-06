import { describe, expect, it } from "vitest";
import { isIdentifier, isIdentifierArray } from "./identifier";

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
