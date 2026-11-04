/**
 * Every calendar and tree source names a path into the record the ambient list
 * holds, so each takes `SourceProp`. The range-filter helpers keep `string`:
 * they build filter keys.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type CalendarList from "./calendar-list.vue";
import type TreeList from "./tree-list.vue";

describe("CalendarList and TreeList sources", () => {
  it("each calendar and tree source prop is SourceProp", () => {
    type Calendar = InstanceType<typeof CalendarList>["$props"];
    type CalendarSource = NonNullable<
      Calendar["startSource" | "endSource" | "titleSource" | "colorSource"]
    >;
    expectTypeOf<CalendarSource>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Calendar["startSource"]>().toEqualTypeOf<SourceProp>();

    type Tree = InstanceType<typeof TreeList>["$props"];
    type TreeSource = NonNullable<
      Tree["parentSource" | "titleSource" | "iconSource"]
    >;
    expectTypeOf<TreeSource>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Tree["parentSource"]>().toEqualTypeOf<SourceProp>();
  });
});
