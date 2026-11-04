import { describe, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import { buildPivotTable } from "./pivot-grid";

interface Sale {
  id: number;
  region: string;
  product: string;
  amount: number;
  meta: { channel: string };
}

const sales: Sale[] = [];
const loose: (LooseRecord & { id: number })[] = [];

describe("buildPivotTable sources", () => {
  it("buildPivotTable accepts a path of the record", () => {
    buildPivotTable(sales, {
      rowSource: "region",
      columnSource: "meta.channel",
      valueSource: "amount",
      aggregator: "sum",
    });
  });

  it("it rejects a path that is not on the record", () => {
    buildPivotTable(sales, {
      // @ts-expect-error not a path of Sale
      rowSource: "area",
      columnSource: "product",
    });
    buildPivotTable(sales, {
      rowSource: "region",
      columnSource: "product",
      // @ts-expect-error not a path of Sale
      valueSource: "price",
    });
  });

  it("a loose record takes any string", () => {
    buildPivotTable(loose, {
      rowSource: "anything.at[0].all",
      columnSource: "whatever",
    });
  });
});
