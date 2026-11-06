import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { PivotGridProps } from "./pivot-grid.vue";

// A type alias: an interface has no index signature, so it does not satisfy
// the grid's `LooseRecord` constraint.
type Shipment = {
  id: number;
  carrier: string;
  destination: { country: string };
};
type ShipmentProps = PivotGridProps<Shipment>;

describe("PivotGrid sources", () => {
  it("the three sources are SourceProp", () => {
    type Loose = PivotGridProps;
    expectTypeOf<Loose["rowSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Loose["columnSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Loose["valueSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("they follow an explicit record type", () => {
    expectTypeOf<ShipmentProps["rowSource"]>().toEqualTypeOf<
      SourceProp<Shipment>
    >();
    expectTypeOf<ShipmentProps["columnSource"]>().toEqualTypeOf<
      SourceProp<Shipment>
    >();
    expectTypeOf<ShipmentProps["valueSource"]>().toEqualTypeOf<
      SourceProp<Shipment> | undefined
    >();
    expectTypeOf<"destination.country">().toExtend<
      ShipmentProps["rowSource"]
    >();
  });

  it("a path that is not on the record is rejected", () => {
    const props: ShipmentProps[] = [
      // @ts-expect-error `weight` is not a path of Shipment
      { rowSource: "weight", columnSource: "carrier" },
      // @ts-expect-error `destination.city` is not a path of Shipment
      { rowSource: "carrier", columnSource: "destination.city" },
      // @ts-expect-error `cost` is not a path of Shipment
      { rowSource: "carrier", columnSource: "carrier", valueSource: "cost" },
    ];
    expectTypeOf(props).not.toBeAny();
  });
});
