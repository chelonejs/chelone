/**
 * Every calendar and tree source names a path into the record the ambient list
 * holds, so each takes `SourceProp`. The range-filter helpers keep `string`:
 * they build filter keys.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { CalendarListProps } from "./calendar-list";
import type { TreeListProps } from "./tree-list";

describe("CalendarList and TreeList sources", () => {
  it("each calendar and tree source prop is SourceProp", () => {
    type Calendar = CalendarListProps;
    expectTypeOf<Calendar["startSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Calendar["endSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<Calendar["titleSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<Calendar["colorSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();

    expectTypeOf<TreeListProps["parentSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<TreeListProps["titleSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<TreeListProps["iconSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });
});
