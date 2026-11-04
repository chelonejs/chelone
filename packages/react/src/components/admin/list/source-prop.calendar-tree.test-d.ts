/**
 * A calendar source names a path into the record the calendar is typed over,
 * so it takes `SourcePath<RecordType>`. A tree source names a path into the
 * ambient list's record, so it takes `SourceProp`. The range-filter helpers
 * keep `string`: they build filter keys.
 */

import type { LooseRecord, SourcePath, SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { CalendarListProps } from "./calendar-list";
import type { TreeListProps } from "./tree-list";

interface Post {
  id: number;
  title: string;
  startsAt: string;
  author: { name: string };
}

describe("CalendarList and TreeList sources", () => {
  it("each calendar source prop is SourcePath of the record", () => {
    type Calendar = CalendarListProps<Post>;
    expectTypeOf<Calendar["startSource"]>().toEqualTypeOf<SourcePath<Post>>();
    expectTypeOf<Calendar["endSource"]>().toEqualTypeOf<
      SourcePath<Post> | undefined
    >();
    expectTypeOf<Calendar["titleSource"]>().toEqualTypeOf<
      SourcePath<Post> | undefined
    >();
    expectTypeOf<Calendar["colorSource"]>().toEqualTypeOf<
      SourcePath<Post> | undefined
    >();
  });

  it("a calendar source accepts a path of the record and rejects one it lacks", () => {
    type Start = CalendarListProps<Post>["startSource"];
    expectTypeOf<"startsAt">().toExtend<Start>();
    expectTypeOf<"author.name">().toExtend<Start>();
    // @ts-expect-error Post has no `endsAt`
    expectTypeOf<"endsAt">().toExtend<Start>();
  });

  it("a calendar over the default record accepts any string source", () => {
    expectTypeOf<CalendarListProps["startSource"]>().toEqualTypeOf<
      SourcePath<LooseRecord>
    >();
    expectTypeOf<"anything">().toExtend<CalendarListProps["startSource"]>();
  });

  it("each tree source prop is SourceProp", () => {
    expectTypeOf<TreeListProps["parentSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<TreeListProps["titleSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<TreeListProps["iconSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });
});
