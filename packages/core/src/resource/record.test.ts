import { describe, expect, it } from "vitest";
import { isLooseRecord, isResourceRecord } from "./record";

describe("isLooseRecord", () => {
  it("isLooseRecord accepts an object with an id", () => {
    expect(isLooseRecord({ id: 1, title: "Hello" })).toBe(true);
  });

  it("isLooseRecord rejects an array", () => {
    expect(isLooseRecord(Object.assign([], { id: 1 }))).toBe(false);
  });
});

describe("isResourceRecord", () => {
  it("accepts an object with an id, whatever its type", () => {
    // type-escape: the guard takes a value of unknown type
    const value: unknown = { id: "a", title: "Hello" };
    expect(isResourceRecord(value)).toBe(true);
  });

  it("rejects a value without an id, an array, null and a primitive", () => {
    expect(isResourceRecord({ title: "Hello" })).toBe(false);
    expect(isResourceRecord(Object.assign([], { id: 1 }))).toBe(false);
    expect(isResourceRecord(null)).toBe(false);
    expect(isResourceRecord("id")).toBe(false);
  });
});
