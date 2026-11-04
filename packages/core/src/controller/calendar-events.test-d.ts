import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import { toCalendarEvents } from "./calendar-events";

interface Meeting {
  id: number;
  starts_at: string;
  ends_at?: string;
  title: string;
  status: string;
  room: { name: string };
}

const meetings: Meeting[] = [];
const loose: LooseRecord[] = [];
const getTitle = () => "";

describe("toCalendarEvents sources", () => {
  it("toCalendarEvents accepts a path of the record for each source", () => {
    const events = toCalendarEvents(meetings, {
      startSource: "starts_at",
      endSource: "ends_at",
      titleSource: "room.name",
      colorSource: "status",
      getTitle,
    });
    expectTypeOf(events[0]?.record).toEqualTypeOf<Meeting | undefined>();
  });

  it("toCalendarEvents rejects a startSource that is not a path", () => {
    toCalendarEvents(meetings, {
      // @ts-expect-error not a path of Meeting
      startSource: "start_at",
      getTitle,
    });
  });

  it("toCalendarEvents rejects an endSource, titleSource and colorSource that are not paths", () => {
    toCalendarEvents(meetings, {
      startSource: "starts_at",
      // @ts-expect-error not a path of Meeting
      endSource: "end_at",
      // @ts-expect-error not a path of Meeting
      titleSource: "room.label",
      // @ts-expect-error not a path of Meeting
      colorSource: "state",
      getTitle,
    });
  });

  it("a loose record takes any string", () => {
    toCalendarEvents(loose, {
      startSource: "anything.at[0].all",
      endSource: "x",
      titleSource: "y",
      colorSource: "z",
      getTitle,
    });
  });
});
