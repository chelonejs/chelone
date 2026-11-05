import { describe, expect, it } from "vitest";
import { isFilterBranch } from "./filter-branch";

class Range {
  constructor(readonly from: number) {}
}

describe("isFilterBranch", () => {
  it.each([
    ["{}", {}],
    ["a null-prototype object", Object.create(null)],
    ["a class instance", new Range(1)],
  ])("isFilterBranch accepts {}, a null-prototype object and a class instance (%s)", (_name, value) => {
    expect(isFilterBranch(value)).toBe(true);
  });

  it.each([
    ["a Date", new Date()],
    ["an array", []],
    ["null", null],
    ["undefined", undefined],
    ["a string", "x"],
    ["a number", 1],
    ["a function", () => 1],
  ])("isFilterBranch refuses a Date, an array, null, undefined, a string, a number and a function (%s)", (_name, value) => {
    expect(isFilterBranch(value)).toBe(false);
  });
});
