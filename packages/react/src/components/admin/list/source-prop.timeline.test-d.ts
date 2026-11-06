import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { RecordTimelineProps } from "./record-timeline";

// A type alias: an interface has no index signature, so it does not satisfy
// the timeline's `LooseRecord` constraint.
type Activity = {
  id: number;
  text: string;
  at: string;
  actor: { name: string };
  kind: string;
};

describe("RecordTimeline sources", () => {
  it("the sources are SourceProp", () => {
    expectTypeOf<
      RecordTimelineProps["messageSource"]
    >().toEqualTypeOf<SourceProp>();
    expectTypeOf<
      RecordTimelineProps["timestampSource"]
    >().toEqualTypeOf<SourceProp>();
    expectTypeOf<RecordTimelineProps["userSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<RecordTimelineProps["iconSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("they follow an explicit record type", () => {
    expectTypeOf<
      RecordTimelineProps<Activity>["messageSource"]
    >().toEqualTypeOf<SourceProp<Activity>>();
    expectTypeOf<
      RecordTimelineProps<Activity>["timestampSource"]
    >().toEqualTypeOf<SourceProp<Activity>>();
    expectTypeOf<RecordTimelineProps<Activity>["userSource"]>().toEqualTypeOf<
      SourceProp<Activity> | undefined
    >();
    expectTypeOf<RecordTimelineProps<Activity>["iconSource"]>().toEqualTypeOf<
      SourceProp<Activity> | undefined
    >();
    expectTypeOf<"actor.name">().toExtend<
      NonNullable<RecordTimelineProps<Activity>["userSource"]>
    >();
  });

  it("a path that is not on the record is rejected", () => {
    const message: RecordTimelineProps<Activity> = {
      // @ts-expect-error `body` is not a path of Activity
      messageSource: "body",
      timestampSource: "at",
    };
    const timestamp: RecordTimelineProps<Activity> = {
      messageSource: "text",
      // @ts-expect-error `when` is not a path of Activity
      timestampSource: "when",
    };
    const user: RecordTimelineProps<Activity> = {
      messageSource: "text",
      timestampSource: "at",
      // @ts-expect-error `actor.email` is not a path of Activity
      userSource: "actor.email",
    };
    const icon: RecordTimelineProps<Activity> = {
      messageSource: "text",
      timestampSource: "at",
      // @ts-expect-error `type` is not a path of Activity
      iconSource: "type",
    };
    expectTypeOf(message).not.toBeAny();
    expectTypeOf(timestamp).not.toBeAny();
    expectTypeOf(user).not.toBeAny();
    expectTypeOf(icon).not.toBeAny();
  });
});
