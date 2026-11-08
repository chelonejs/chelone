import { describe, expectTypeOf, it } from "vitest";
import type { FilterPayload } from "../data/types";
import type { LooseRecord } from "../resource/record";
import type { FilterSourceKey } from "../resource/source-path";
import {
  calendarRangeFilter,
  omitCalendarRangeFilter,
  staleCalendarRangeKeys,
  toCalendarEvents,
} from "./calendar-events";

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

const range = { start: new Date(0), end: new Date(1) };

describe("calendar range helpers", () => {
  it("calendarRangeFilter returns a FilterPayload of the record", () => {
    const filter = calendarRangeFilter<Meeting>("starts_at", range, "ends_at");
    expectTypeOf(filter).toEqualTypeOf<FilterPayload<Meeting>>();
  });

  it("calendarRangeFilter rejects a source that is not a path", () => {
    // @ts-expect-error not a path of Meeting
    calendarRangeFilter<Meeting>("start_at", range);
    // @ts-expect-error not a path of Meeting
    calendarRangeFilter<Meeting>("starts_at", range, "end_at");
  });

  it("bare calls keep working on a loose record", () => {
    expectTypeOf(calendarRangeFilter("starts_at", range)).toExtend<
      FilterPayload<LooseRecord>
    >();
    expectTypeOf(staleCalendarRangeKeys("starts_at", "ends_at")).toExtend<
      FilterSourceKey<LooseRecord>[]
    >();
  });

  it("staleCalendarRangeKeys returns the filter keys of the record", () => {
    expectTypeOf(
      staleCalendarRangeKeys<Meeting>("starts_at", "ends_at"),
    ).toEqualTypeOf<FilterSourceKey<Meeting>[]>();
  });

  it("staleCalendarRangeKeys rejects a source that is not a path", () => {
    // @ts-expect-error not a path of Meeting
    staleCalendarRangeKeys<Meeting>("start_at");
    // @ts-expect-error not a path of Meeting
    staleCalendarRangeKeys<Meeting>("starts_at", "end_at");
  });

  it("omitCalendarRangeFilter takes and returns a FilterPayload of the record", () => {
    const filter: FilterPayload<Meeting> = { status_gte: "a" };
    expectTypeOf(
      omitCalendarRangeFilter<Meeting>(filter, "starts_at", "ends_at"),
    ).toEqualTypeOf<FilterPayload<Meeting>>();
  });

  it("omitCalendarRangeFilter rejects a misspelt filter key and source", () => {
    // @ts-expect-error not a filter key of Meeting
    omitCalendarRangeFilter<Meeting>({ start_at_gte: "x" }, "starts_at");
    // @ts-expect-error not a path of Meeting
    omitCalendarRangeFilter<Meeting>({}, "start_at");
  });
});
