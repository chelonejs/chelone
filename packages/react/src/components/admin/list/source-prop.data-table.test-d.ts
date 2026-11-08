/**
 * A column's `source` is the field it shows and the key it sorts by, and
 * `SortButton` lists sort keys: all of them are paths into the record, so they
 * take `SourceProp`. `SortPayload.field` is a `SourceProp` too; the plain
 * `string` is only the wire sort a data provider takes (`LooseSortPayload`).
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { SortButtonProps } from "../buttons/sort-button";
import type { DataTable } from "./data-table";

describe("DataTable and SortButton sources", () => {
  it("DataTable.Col source is SourceProp", () => {
    type Props = React.ComponentProps<typeof DataTable.Col>;
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });

  it("DataTable.NumberCol source is SourceProp", () => {
    type Props = React.ComponentProps<typeof DataTable.NumberCol>;
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("SortButton fields is an array of SourceProp", () => {
    expectTypeOf<SortButtonProps["fields"]>().toEqualTypeOf<SourceProp[]>();
  });
});
