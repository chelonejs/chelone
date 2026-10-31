import { describe, expect, it } from "vitest";
import { isFilterSelected, toggleFilterValue } from "./filter-toggle";

describe("isFilterSelected", () => {
  it("is true when every defined key of the value matches the filters", () => {
    expect(
      isFilterSelected(
        { status: "draft", views: 3 },
        { status: "draft", views: 3, q: "x" },
      ),
    ).toBe(true);
    expect(
      isFilterSelected({ status: "draft", views: 3 }, { status: "draft" }),
    ).toBe(false);
    expect(isFilterSelected({ status: "draft" }, { status: "live" })).toBe(
      false,
    );
  });

  it("ignores keys of the value that are undefined", () => {
    expect(
      isFilterSelected(
        { status: "draft", tag: undefined },
        { status: "draft" },
      ),
    ).toBe(true);
  });

  it("compares nested objects partially and arrays for equality", () => {
    expect(
      isFilterSelected(
        { range: { gte: 1 } },
        { range: { gte: 1, lte: 9 }, q: "x" },
      ),
    ).toBe(true);
    expect(
      isFilterSelected({ range: { gte: 2 } }, { range: { gte: 1, lte: 9 } }),
    ).toBe(false);
    expect(isFilterSelected({ tags: ["a", "b"] }, { tags: ["a", "b"] })).toBe(
      true,
    );
    // lodash's contains-all rule would call this selected
    expect(isFilterSelected({ tags: ["a"] }, { tags: ["a", "b"] })).toBe(false);
    expect(isFilterSelected({ tags: ["b", "a"] }, { tags: ["a", "b"] })).toBe(
      false,
    );
  });
});

describe("toggleFilterValue", () => {
  it("merges an unselected value into the filters", () => {
    expect(toggleFilterValue({ status: "draft" }, { q: "x" })).toEqual({
      q: "x",
      status: "draft",
    });
    expect(toggleFilterValue({ status: "draft" }, { status: "live" })).toEqual({
      status: "draft",
    });
  });

  it("removes the keys of a selected value and keeps the other filters", () => {
    expect(
      toggleFilterValue(
        { status: "draft", views: 3 },
        { status: "draft", views: 3, q: "x" },
      ),
    ).toEqual({ q: "x" });
  });

  it("leaves its arguments unchanged", () => {
    const value = { status: "draft", range: { gte: 1 } };
    const filters = { status: "draft", range: { gte: 1, lte: 9 }, q: "x" };
    toggleFilterValue(value, filters);
    toggleFilterValue({ status: "live" }, filters);
    expect(value).toEqual({ status: "draft", range: { gte: 1 } });
    expect(filters).toEqual({
      status: "draft",
      range: { gte: 1, lte: 9 },
      q: "x",
    });
  });
});
