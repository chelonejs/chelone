import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { PivotGridProps } from "./pivot-grid";

// A type alias: an interface has no index signature, so it does not satisfy
// the grid's `LooseRecord` constraint.
type Order = {
  id: number;
  region: string;
  customer: { name: string };
};

describe("PivotGrid sources", () => {
  it("the three sources are SourceProp", () => {
    expectTypeOf<PivotGridProps["rowSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<PivotGridProps["columnSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<PivotGridProps["valueSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("they follow an explicit record type", () => {
    expectTypeOf<PivotGridProps<Order>["rowSource"]>().toEqualTypeOf<
      SourceProp<Order>
    >();
    expectTypeOf<PivotGridProps<Order>["columnSource"]>().toEqualTypeOf<
      SourceProp<Order>
    >();
    expectTypeOf<PivotGridProps<Order>["valueSource"]>().toEqualTypeOf<
      SourceProp<Order> | undefined
    >();
    expectTypeOf<"customer.name">().toExtend<
      PivotGridProps<Order>["rowSource"]
    >();
  });

  it("a path that is not on the record is rejected", () => {
    const row: PivotGridProps<Order> = {
      // @ts-expect-error `area` is not a path of Order
      rowSource: "area",
      columnSource: "region",
    };
    const column: PivotGridProps<Order> = {
      rowSource: "region",
      // @ts-expect-error `customer.email` is not a path of Order
      columnSource: "customer.email",
    };
    const value: PivotGridProps<Order> = {
      rowSource: "region",
      columnSource: "region",
      // @ts-expect-error `total` is not a path of Order
      valueSource: "total",
    };
    expectTypeOf(row).not.toBeAny();
    expectTypeOf(column).not.toBeAny();
    expectTypeOf(value).not.toBeAny();
  });
});
