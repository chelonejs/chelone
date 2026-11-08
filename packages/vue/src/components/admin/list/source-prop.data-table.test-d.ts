/**
 * A column's `source` is the field it shows and the key it sorts by, and
 * `SortButton` lists sort keys: all of them are paths into the record, so they
 * take `SourceProp`. `SortPayload.field` is a `SourceProp` too; the plain
 * `string` is only the wire sort a data provider takes (`LooseSortPayload`).
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type SortButton from "../buttons/sort-button.vue";
import type DataTableCol from "./data-table-col.vue";
import type DataTableNumberCol from "./data-table-number-col.vue";

describe("DataTable and SortButton sources", () => {
  it("DataTableCol source is SourceProp", () => {
    type Props = InstanceType<typeof DataTableCol>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });

  it("DataTableNumberCol source is SourceProp", () => {
    type Props = InstanceType<typeof DataTableNumberCol>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("SortButton fields is an array of SourceProp", () => {
    type Props = InstanceType<typeof SortButton>["$props"];
    expectTypeOf<Props["fields"]>().toEqualTypeOf<SourceProp[]>();
  });
});
