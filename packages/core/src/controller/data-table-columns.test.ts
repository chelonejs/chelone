import { describe, expect, it } from "vitest";
import {
  arrangeColumns,
  columnLabelMatches,
  dataTableColumnKeys,
  defaultDataTableStoreKey,
  getDataTableColumnId,
  moveColumn,
  moveColumnTo,
  toggleHiddenColumn,
} from "./data-table-columns";

describe("arrangeColumns", () => {
  it("keeps declared order with no stored state", () => {
    expect(arrangeColumns(["a", "b", "c"], { hidden: [], order: [] })).toEqual([
      0, 1, 2,
    ]);
  });

  it("applies the stored order and appends ids it does not list", () => {
    expect(
      arrangeColumns(["a", "b", "c", "d"], { hidden: [], order: ["c", "a"] }),
    ).toEqual([2, 0, 1, 3]);
  });

  it("ignores stored ids that no column has", () => {
    expect(
      arrangeColumns(["a", "b"], { hidden: [], order: ["gone", "b", "a"] }),
    ).toEqual([1, 0]);
  });

  it("leaves columns without an id at their own index", () => {
    expect(
      arrangeColumns(["a", undefined, "b", "c", undefined], {
        hidden: [],
        order: ["c", "b", "a"],
      }),
    ).toEqual([3, 1, 2, 0, 4]);
  });

  it("drops hidden ids and keeps the rest in order", () => {
    expect(
      arrangeColumns(["a", undefined, "b", "c"], {
        hidden: ["b", "unknown"],
        order: ["c", "b", "a"],
      }),
    ).toEqual([3, 1, 0]);
  });

  it("moves and hides columns that share an id together", () => {
    const ids = ["a", "b", "a", "c"];
    expect(arrangeColumns(ids, { hidden: [], order: ["b", "a"] })).toEqual([
      1, 0, 2, 3,
    ]);
    expect(arrangeColumns(ids, { hidden: ["a"], order: [] })).toEqual([1, 3]);
  });

  it("does not mutate its arguments", () => {
    const ids = ["a", "b"];
    const hidden = ["a"];
    const order = ["b", "a"];
    arrangeColumns(ids, { hidden, order });
    expect(ids).toEqual(["a", "b"]);
    expect(hidden).toEqual(["a"]);
    expect(order).toEqual(["b", "a"]);
  });
});

describe("moveColumn", () => {
  it("swaps a column with its neighbour in either direction", () => {
    const ids = ["a", "b", "c"];
    expect(moveColumn(["a", "b", "c"], ids, "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveColumn(["a", "b", "c"], ids, "b", -1)).toEqual(["b", "a", "c"]);
  });

  it("returns the resolved order at the first and last position", () => {
    const ids = ["a", "b", "c"];
    expect(moveColumn(["c"], ids, "c", -1)).toEqual(["c", "a", "b"]);
    expect(moveColumn(["c"], ids, "b", 1)).toEqual(["c", "a", "b"]);
    expect(moveColumn([], ids, "nope", 1)).toEqual(["a", "b", "c"]);
  });

  it("swaps past a hidden neighbour", () => {
    const ids = ["a", "hidden", "c"];
    expect(moveColumn(ids, ids, "c", -1)).toEqual(["a", "c", "hidden"]);
  });

  it("does not mutate its arguments", () => {
    const order = ["a", "b"];
    const result = moveColumn(order, ["a", "b"], "a", 1);
    expect(order).toEqual(["a", "b"]);
    expect(result).not.toBe(order);
  });
});

describe("moveColumnTo", () => {
  it("moves a column to an index, clamped to the ends", () => {
    const ids = ["a", "b", "c", "d"];
    expect(moveColumnTo(ids, ids, "a", 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveColumnTo(ids, ids, "d", 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveColumnTo(ids, ids, "b", 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveColumnTo(ids, ids, "c", -5)).toEqual(["c", "a", "b", "d"]);
  });

  it("indexes the resolved order, not the declared one", () => {
    expect(moveColumnTo(["c"], ["a", "b", "c"], "a", 1)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("returns the resolved order for an unknown id", () => {
    expect(moveColumnTo(["c"], ["a", "b", "c"], "nope", 1)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("does not mutate its arguments", () => {
    const order = ["a", "b"];
    const result = moveColumnTo(order, ["a", "b"], "a", 1);
    expect(order).toEqual(["a", "b"]);
    expect(result).toEqual(["b", "a"]);
  });
});

describe("toggleHiddenColumn", () => {
  it("adds a missing id, removes a present one and leaves its argument unchanged", () => {
    const hidden = ["a"];
    expect(toggleHiddenColumn(hidden, "b")).toEqual(["a", "b"]);
    expect(toggleHiddenColumn(hidden, "a")).toEqual([]);
    expect(hidden).toEqual(["a"]);
  });
});

describe("getDataTableColumnId", () => {
  it("prefers source, falls back to a string label and gives undefined otherwise", () => {
    expect(getDataTableColumnId({ source: "title", label: "Title" })).toBe(
      "title",
    );
    expect(getDataTableColumnId({ source: "", label: "Title" })).toBe("Title");
    expect(getDataTableColumnId({ label: "Title" })).toBe("Title");
    expect(getDataTableColumnId({ label: "" })).toBeUndefined();
    expect(getDataTableColumnId({ label: 3 })).toBeUndefined();
    expect(getDataTableColumnId({})).toBeUndefined();
  });
});

describe("columnLabelMatches", () => {
  it("matches ignoring case and accents and accepts an empty query", () => {
    expect(columnLabelMatches("Anything", "")).toBe(true);
    expect(columnLabelMatches("Créé le", "CREE")).toBe(true);
    expect(columnLabelMatches("Created", "créa")).toBe(true);
    expect(columnLabelMatches("Created", "créé")).toBe(false);
    expect(columnLabelMatches("Created", "ate")).toBe(true);
    expect(columnLabelMatches("Title", "zzz")).toBe(false);
  });
});

describe("dataTableColumnKeys", () => {
  it("derives the three keys from the store key", () => {
    expect(defaultDataTableStoreKey("posts")).toBe("posts.datatable");
    expect(dataTableColumnKeys("posts.datatable")).toEqual({
      hidden: "posts.datatable",
      order: "posts.datatable_columnOrder",
      columns: "posts.datatable_columns",
    });
  });
});
