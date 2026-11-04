import { describe, expectTypeOf, it } from "vitest";
import { toCartesianRows, toDonutSlices } from "./chart-data";

type Sale = { day: string; total: number; region: string };
const sales: Sale[] = [];

describe("chart data types", () => {
  it("keeps the type of the x field on each row", () => {
    expectTypeOf(toCartesianRows(sales, "day", "total")).toEqualTypeOf<
      { index: number; x: string; y: number | null }[]
    >();
  });

  it("rejects a field the row does not have", () => {
    // @ts-expect-error `dya` is not a key of `Sale`
    toCartesianRows(sales, "dya", "total");
    // @ts-expect-error `totl` is not a key of `Sale`
    toDonutSlices(sales, "region", "totl");
  });
});
