import { describe, expect, it } from "vitest";
import { buildPivotTable, formatPivotValue } from "./pivot-grid";

type Row = Record<string, unknown>;

describe("buildPivotTable", () => {
  it("groups records into sorted row and column keys", () => {
    const records: Row[] = [
      { region: "south", product: "pear" },
      { region: "north", product: "plum" },
      { region: "south", product: "plum" },
      { region: "south", product: "plum" },
    ];
    const table = buildPivotTable(records, {
      rowSource: "region",
      columnSource: "product",
    });
    expect(table.rowKeys).toEqual(["north", "south"]);
    expect(table.columnKeys).toEqual(["pear", "plum"]);
    expect(table.cells).toEqual([
      [null, 1],
      [1, 2],
    ]);
    expect(table.rowTotals).toEqual([1, 3]);
    expect(table.columnTotals).toEqual([1, 3]);
    expect(table.grandTotal).toBe(4);
  });

  it("sorts numeric keys by value and puts the empty key last", () => {
    const records: Row[] = [
      { r: 10, c: "" },
      { r: 9, c: "b" },
      { r: null, c: "a" },
      { r: 2, c: "a" },
    ];
    const table = buildPivotTable(records, {
      rowSource: "r",
      columnSource: "c",
    });
    expect(table.rowKeys).toEqual(["2", "9", "10", ""]);
    expect(table.columnKeys).toEqual(["a", "b", ""]);
  });

  it("reads a null, undefined or empty key as the empty key", () => {
    const records: Row[] = [
      { r: null, c: undefined },
      { r: undefined, c: "" },
      { r: "", c: null },
      { c: "x" },
    ];
    const table = buildPivotTable(records, {
      rowSource: "r",
      columnSource: "c",
    });
    expect(table.rowKeys).toEqual([""]);
    expect(table.columnKeys).toEqual(["x", ""]);
    expect(table.cells).toEqual([[1, 3]]);
  });

  it("counts the records in a cell when no valueSource is given", () => {
    const records: Row[] = [
      { r: "a", c: "x", v: 100 },
      { r: "a", c: "x", v: null },
      { r: "a", c: "y" },
    ];
    const table = buildPivotTable(records, {
      rowSource: "r",
      columnSource: "c",
    });
    expect(table.cells).toEqual([[2, 1]]);
    const withValue = buildPivotTable(records, {
      rowSource: "r",
      columnSource: "c",
      valueSource: "v",
      aggregator: "count",
    });
    expect(withValue.cells).toEqual([[2, 1]]);
  });

  it("sums, averages, and takes the min and max of the value source", () => {
    const records: Row[] = [
      { r: "a", c: "x", v: 4 },
      { r: "a", c: "x", v: 2 },
      { r: "a", c: "x", v: 9 },
    ];
    const base = { rowSource: "r", columnSource: "c", valueSource: "v" };
    const cell = (aggregator: "sum" | "avg" | "min" | "max") =>
      buildPivotTable(records, { ...base, aggregator }).cells[0]?.[0];
    expect(cell("sum")).toBe(15);
    expect(cell("avg")).toBe(5);
    expect(cell("min")).toBe(2);
    expect(cell("max")).toBe(9);
  });

  it("skips null, boolean, empty and non-numeric values and reads numeric strings", () => {
    const records: Row[] = [
      { r: "a", c: "x", v: "3" },
      { r: "a", c: "x", v: 4.5 },
      { r: "a", c: "x", v: null },
      { r: "a", c: "x", v: undefined },
      { r: "a", c: "x", v: true },
      { r: "a", c: "x", v: "" },
      { r: "a", c: "x", v: "abc" },
      { r: "a", c: "x", v: Number.NaN },
      { r: "a", c: "x", v: Number.POSITIVE_INFINITY },
      { r: "a", c: "y", v: null },
      { r: "a", c: "y", v: false },
    ];
    const options = {
      rowSource: "r",
      columnSource: "c",
      valueSource: "v",
    } as const;
    const sum = buildPivotTable(records, { ...options, aggregator: "sum" });
    expect(sum.cells).toEqual([[7.5, null]]);
    const min = buildPivotTable(records, { ...options, aggregator: "min" });
    expect(min.cells).toEqual([[3, null]]);
    const avg = buildPivotTable(records, { ...options, aggregator: "avg" });
    expect(avg.cells).toEqual([[3.75, null]]);
    expect(avg.columnTotals).toEqual([3.75, null]);
  });

  it("an empty intersection is null", () => {
    const records: Row[] = [
      { r: "a", c: "x", v: 1 },
      { r: "b", c: "y", v: 2 },
    ];
    const table = buildPivotTable(records, {
      rowSource: "r",
      columnSource: "c",
      valueSource: "v",
      aggregator: "sum",
    });
    expect(table.cells).toEqual([
      [1, null],
      [null, 2],
    ]);
  });

  it("totals aggregate the raw values, so an average total is not a sum of averages", () => {
    const records: Row[] = [
      { r: "a", c: "x", v: 10 },
      { r: "a", c: "y", v: 2 },
      { r: "a", c: "y", v: 4 },
      { r: "b", c: "x", v: 6 },
    ];
    const table = buildPivotTable(records, {
      rowSource: "r",
      columnSource: "c",
      valueSource: "v",
      aggregator: "avg",
    });
    expect(table.cells).toEqual([
      [10, 3],
      [6, null],
    ]);
    expect(table.rowTotals).toEqual([16 / 3, 6]);
    expect(table.columnTotals).toEqual([8, 3]);
    expect(table.grandTotal).toBe(22 / 4);
  });

  it("reads nested sources by path", () => {
    const records: Row[] = [
      { geo: { region: "north" }, tags: [{ k: "a" }], stats: { n: 5 } },
      { geo: { region: "north" }, tags: [{ k: "a" }], stats: { n: 7 } },
    ];
    const table = buildPivotTable(records, {
      rowSource: "geo.region",
      columnSource: "tags[0].k",
      valueSource: "stats.n",
      aggregator: "sum",
    });
    expect(table.rowKeys).toEqual(["north"]);
    expect(table.columnKeys).toEqual(["a"]);
    expect(table.cells).toEqual([[12]]);
  });

  it("a key named __proto__ or constructor is an ordinary row", () => {
    const records: Row[] = [
      { r: "__proto__", c: "constructor" },
      { r: "constructor", c: "constructor" },
      { r: "__proto__", c: "toString" },
    ];
    const table = buildPivotTable(records, {
      rowSource: "r",
      columnSource: "c",
    });
    expect(table.rowKeys).toEqual(["__proto__", "constructor"]);
    expect(table.columnKeys).toEqual(["constructor", "toString"]);
    expect(table.cells).toEqual([
      [1, 1],
      [1, null],
    ]);
    expect(Object.keys({})).toEqual([]);
  });

  it("no records give empty keys and a null grand total", () => {
    const table = buildPivotTable([] as Row[], {
      rowSource: "r",
      columnSource: "c",
    });
    expect(table).toEqual({
      rowKeys: [],
      columnKeys: [],
      cells: [],
      rowTotals: [],
      columnTotals: [],
      grandTotal: null,
    });
  });

  it("does not mutate the records", () => {
    const records: Row[] = [
      { r: "b", c: "y", v: 1 },
      { r: "a", c: "x", v: 2 },
    ];
    const copy = structuredClone(records);
    const options = { rowSource: "r", columnSource: "c", valueSource: "v" };
    Object.freeze(records);
    for (const record of records) Object.freeze(record);
    buildPivotTable(records, { ...options, aggregator: "sum" });
    expect(records).toEqual(copy);
    expect(records.map((record) => record.r)).toEqual(["b", "a"]);
  });
});

describe("formatPivotValue", () => {
  it("prints integers bare and rounds fractions to two digits in the given locale", () => {
    expect(formatPivotValue(5, "en-US")).toBe("5");
    expect(formatPivotValue(1234, "en-US")).toBe("1,234");
    expect(formatPivotValue(3.1459, "en-US")).toBe("3.15");
    expect(formatPivotValue(2.5, "en-US")).toBe("2.5");
    expect(formatPivotValue(1234.567, "de-DE")).toBe("1.234,57");
  });
});
