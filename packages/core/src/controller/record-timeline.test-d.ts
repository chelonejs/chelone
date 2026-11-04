import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import { type RecordTimelineEntry, toTimelineEntries } from "./record-timeline";

interface Activity {
  id: number;
  text: string;
  created_at: string;
  actor: { name: string };
}

const activities: Activity[] = [];
const loose: (LooseRecord & { id: number })[] = [];

describe("toTimelineEntries sources", () => {
  it("toTimelineEntries accepts paths of the record", () => {
    const entries = toTimelineEntries(activities, {
      messageSource: "text",
      timestampSource: "created_at",
      userSource: "actor.name",
      iconSource: "text",
    });
    expectTypeOf(entries).toEqualTypeOf<RecordTimelineEntry<Activity>[]>();
  });

  it("it rejects a path that is not on the record", () => {
    toTimelineEntries(activities, {
      // @ts-expect-error not a path of Activity
      messageSource: "message",
      timestampSource: "created_at",
    });
  });

  it("a loose record takes any string", () => {
    toTimelineEntries(loose, {
      messageSource: "anything.at[0].all",
      timestampSource: "when",
    });
  });
});
