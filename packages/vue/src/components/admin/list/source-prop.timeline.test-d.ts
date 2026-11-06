/**
 * Every timeline source names a path into the record the ambient list holds,
 * so each takes `SourceProp`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { RecordTimelineProps } from "./record-timeline.vue";

// A type alias: an interface has no index signature, so it does not satisfy
// the component's `LooseRecord` constraint.
type Audit = {
  id: string;
  summary: string;
  happenedAt: string;
  author: { login: string };
  category: string;
};

type SourceKey =
  | "messageSource"
  | "timestampSource"
  | "userSource"
  | "iconSource";

describe("RecordTimeline sources", () => {
  it("the sources are SourceProp", () => {
    type Sources = RecordTimelineProps[SourceKey];
    expectTypeOf<NonNullable<Sources>>().toEqualTypeOf<SourceProp>();
    expectTypeOf<
      RecordTimelineProps["messageSource"]
    >().toEqualTypeOf<SourceProp>();
    expectTypeOf<RecordTimelineProps["userSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("they follow an explicit record type", () => {
    type Sources = RecordTimelineProps<Audit>[SourceKey];
    expectTypeOf<NonNullable<Sources>>().toEqualTypeOf<SourceProp<Audit>>();
    expectTypeOf<RecordTimelineProps<Audit>["iconSource"]>().toEqualTypeOf<
      SourceProp<Audit> | undefined
    >();
    expectTypeOf<"author.login">().toExtend<
      NonNullable<RecordTimelineProps<Audit>["userSource"]>
    >();
  });

  it("a path that is not on the record is rejected", () => {
    const base = {
      messageSource: "summary",
      timestampSource: "happenedAt",
    } as const;
    const bad: RecordTimelineProps<Audit>[] = [
      // @ts-expect-error `body` is not a path of Audit
      { ...base, messageSource: "body" },
      // @ts-expect-error `when` is not a path of Audit
      { ...base, timestampSource: "when" },
      // @ts-expect-error `author.email` is not a path of Audit
      { ...base, userSource: "author.email" },
      // @ts-expect-error `type` is not a path of Audit
      { ...base, iconSource: "type" },
    ];
    expectTypeOf(bad).not.toBeAny();
  });
});
