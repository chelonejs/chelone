import { describe, expect, it } from "vitest";
import {
  chartColor,
  DEFAULT_CHART_COLORS,
  getMetricDelta,
  hasChartValues,
  toCartesianRows,
  toDonutSlices,
} from "./chart-data";

describe("toCartesianRows", () => {
  it("keeps data order and the x value as given", () => {
    const rows = toCartesianRows(
      [
        { day: "Mon", sales: 3 },
        { day: 2, sales: 5 },
        { day: "Wed", sales: 1 },
      ],
      "day",
      "sales",
    );
    expect(rows).toEqual([
      { index: 0, x: "Mon", y: 3 },
      { index: 1, x: 2, y: 5 },
      { index: 2, x: "Wed", y: 1 },
    ]);
  });

  it("reads a numeric string as a number", () => {
    const rows = toCartesianRows(
      [
        { x: "a", y: "12" },
        { x: "b", y: " 3.5 " },
      ],
      "x",
      "y",
    );
    expect(rows.map((r) => r.y)).toEqual([12, 3.5]);
  });

  it("turns a missing, null or non-numeric value into a null gap", () => {
    const rows = toCartesianRows(
      [
        { x: 1 },
        { x: 2, y: null },
        { x: 3, y: "abc" },
        { x: 4, y: "" },
        { x: 5, y: "  " },
        { x: 6, y: Number.NaN },
        { x: 7, y: Number.POSITIVE_INFINITY },
        { x: 8, y: true },
        { x: 9, y: {} },
        { x: 10, y: 0 },
      ],
      "x",
      "y",
    );
    expect(rows.map((r) => r.y)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      0,
    ]);
  });
});

describe("hasChartValues", () => {
  it("is false for empty data and for rows with no number", () => {
    expect(hasChartValues(toCartesianRows([], "x", "y"))).toBe(false);
    expect(
      hasChartValues(toCartesianRows([{ x: 1 }, { x: 2, y: "n/a" }], "x", "y")),
    ).toBe(false);
    expect(
      hasChartValues(toCartesianRows([{ x: 1 }, { x: 2, y: 0 }], "x", "y")),
    ).toBe(true);
  });
});

describe("toDonutSlices", () => {
  it("gives each positive value its share of the total", () => {
    expect(
      toDonutSlices(
        [
          { name: "a", n: 1 },
          { name: "b", n: 3 },
          { name: 7, n: "4" },
        ],
        "name",
        "n",
      ),
    ).toEqual([
      { label: "a", value: 1, share: 0.125 },
      { label: "b", value: 3, share: 0.375 },
      { label: "7", value: 4, share: 0.5 },
    ]);
  });

  it("leaves out zero, negative and non-number values", () => {
    const slices = toDonutSlices(
      [
        { name: "keep", n: 2 },
        { name: "zero", n: 0 },
        { name: "neg", n: -4 },
        { name: "nan", n: Number.NaN },
        { name: "inf", n: Number.POSITIVE_INFINITY },
        { name: "text", n: "lots" },
        { name: "null", n: null },
        { name: "missing" },
      ],
      "name",
      "n",
    );
    expect(slices).toEqual([{ label: "keep", value: 2, share: 1 }]);
  });

  it("gives a row with a missing or null label an empty label", () => {
    expect(
      toDonutSlices(
        [{ n: 1 }, { name: null, n: 1 }, { name: 0, n: 2 }],
        "name",
        "n",
      ),
    ).toEqual([
      { label: "", value: 1, share: 0.25 },
      { label: "", value: 1, share: 0.25 },
      { label: "0", value: 2, share: 0.5 },
    ]);
  });

  it("returns no slices when the total is zero", () => {
    expect(toDonutSlices([], "name", "n")).toEqual([]);
    expect(
      toDonutSlices(
        [
          { name: "a", n: 0 },
          { name: "b", n: -1 },
        ],
        "name",
        "n",
      ),
    ).toEqual([]);
  });

  it("does not mutate the data", () => {
    const data = [
      { name: "a", n: 1 },
      { name: "b", n: -1 },
      { name: "c", n: "3" },
    ];
    const before = structuredClone(data);
    toDonutSlices(data, "name", "n");
    toCartesianRows(data, "name", "n");
    expect(data).toEqual(before);
  });
});

describe("chartColor", () => {
  it("cycles through the given colors and defaults to the chart variables", () => {
    expect(DEFAULT_CHART_COLORS).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ]);
    expect(chartColor(0)).toBe("var(--chart-1)");
    expect(chartColor(4)).toBe("var(--chart-5)");
    expect(chartColor(5)).toBe("var(--chart-1)");
    expect(chartColor(7)).toBe("var(--chart-3)");
    expect(chartColor(3, ["red", "green"])).toBe("green");
  });

  it("falls back to the chart variables for an empty color list", () => {
    expect(chartColor(0, [])).toBe("var(--chart-1)");
    expect(chartColor(6, [])).toBe("var(--chart-2)");
  });
});

describe("getMetricDelta", () => {
  it("reads up, down and flat with one decimal", () => {
    expect(getMetricDelta(0.1234)).toEqual({ direction: "up", text: "12.3%" });
    expect(getMetricDelta(-0.05)).toEqual({ direction: "down", text: "-5.0%" });
    expect(getMetricDelta(0)).toEqual({ direction: "flat", text: "0.0%" });
    expect(getMetricDelta(undefined)).toBeNull();
  });
});
