import { expectTypeOf, it } from "vitest";
import { getBlockDefaultAttrs } from "./block-document";
import {
  chartBlockSpec,
  recordListBlockSpec,
  referenceRecordBlockSpec,
} from "./data-blocks";

it("getBlockDefaultAttrs of each spec has its attribute types", () => {
  expectTypeOf(
    getBlockDefaultAttrs(referenceRecordBlockSpec.schema),
  ).toEqualTypeOf<{
    resource: string | null;
    id: string | number | null;
    fields?: string[] | undefined | null;
    layout: "card" | "inline" | null;
  }>();
  expectTypeOf(getBlockDefaultAttrs(recordListBlockSpec.schema)).toEqualTypeOf<{
    resource: string | null;
    perPage: number | null;
    fields?: string[] | undefined | null;
  }>();
  expectTypeOf(getBlockDefaultAttrs(chartBlockSpec.schema)).toEqualTypeOf<{
    resource: string | null;
    type: "bar" | "line" | "pie" | null;
    category: string | null;
    value: string | null;
    aggregate: "count" | "sum" | "avg" | null;
    perPage: number | null;
  }>();
});
