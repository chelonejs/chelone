import { describe, expect, it } from "vitest";
import {
  filterFormReflectShape,
  getFilterFormValues,
  mergeFilterValues,
} from "./filter-form-values";

describe("getFilterFormValues", () => {
  it("every form key is present and a key missing from the filter becomes an empty string", () => {
    const result = getFilterFormValues(
      { title: "a", author: undefined, body: null },
      { title: "external" },
    );
    expect(result).toEqual({ title: "external", author: "", body: "" });
  });

  it("rebuilds every inner key of a nested form value", () => {
    const result = getFilterFormValues(
      { range: { from: "1", to: "2" } },
      { range: { from: "5" } },
    );
    expect(result).toEqual({ range: { from: "5", to: "" } });
  });
});

describe("mergeFilterValues", () => {
  it("merges one level deep and replaces arrays", () => {
    const filter = {
      category: "tech",
      range: { from: 1, to: 9 },
      tags: ["a", "b"],
    };
    const merged = mergeFilterValues(filter, {
      range: { to: 3 },
      tags: ["c"],
      title: "x",
    });
    expect(merged).toEqual({
      category: "tech",
      range: { from: 1, to: 3 },
      tags: ["c"],
      title: "x",
    });
    expect(filter.range).toEqual({ from: 1, to: 9 });
  });
});

describe("filterFormReflectShape", () => {
  it("covers current values, registered fields' top-level key and filter keys", () => {
    const shape = filterFormReflectShape(
      { title: "a" },
      { "author.name": {}, "tags[0]": {}, title: {} },
      { category: "tech" },
    );
    expect(Object.keys(shape).sort()).toEqual([
      "author",
      "category",
      "tags",
      "title",
    ]);
    expect(shape.title).toBe("a");
  });
});
