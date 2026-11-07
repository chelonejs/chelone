/**
 * `CalendarList` is typed by its record: every callback and renderer prop
 * receives that record, and the event handed to a renderer carries it.
 */

import type { CalendarEvent, LooseRecord, ResourceRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type {
  CalendarListProps,
  EventRendererProps,
  HeaderRendererProps,
} from "./calendar-list";
import type { CalendarDropRange, CalendarSlot } from "./calendar-month-view";

interface Meeting {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  kind: string;
}

/** What each callback of a list over `RecordType` is called with. */
type CalledWith<RecordType extends ResourceRecord> = {
  select: Parameters<
    NonNullable<CalendarListProps<RecordType>["onSelectEvent"]>
  >[0];
  drop: Parameters<NonNullable<CalendarListProps<RecordType>["onDrop"]>>[0];
  slot: Parameters<
    NonNullable<CalendarListProps<RecordType>["onSelectSlot"]>
  >[0];
  range: Parameters<NonNullable<CalendarListProps<RecordType>["onDrop"]>>[1];
  event: Parameters<
    NonNullable<CalendarListProps<RecordType>["eventRenderer"]>
  >[0];
  header: Parameters<
    NonNullable<CalendarListProps<RecordType>["headerRenderer"]>
  >[0];
};

describe("CalendarList record", () => {
  it("an event callback receives the list's record", () => {
    expectTypeOf<CalledWith<Meeting>["select"]>().toEqualTypeOf<Meeting>();
    expectTypeOf<CalledWith<Meeting>["drop"]>().toEqualTypeOf<Meeting>();
    expectTypeOf<CalledWith<Meeting>["event"]>().toEqualTypeOf<
      EventRendererProps<Meeting>
    >();
    expectTypeOf<CalledWith<Meeting>["event"]["event"]>().toEqualTypeOf<
      CalendarEvent<Meeting>
    >();
  });

  it("a callback written over another record is rejected", () => {
    expectTypeOf<(record: LooseRecord) => void>().not.toMatchTypeOf<
      (record: Meeting) => void
    >();
    expectTypeOf<
      (props: EventRendererProps<LooseRecord>) => null
    >().not.toMatchTypeOf<(props: EventRendererProps<Meeting>) => null>();
  });

  it("the slot and range props stay the list's own, not the record's", () => {
    expectTypeOf<CalledWith<Meeting>["slot"]>().toEqualTypeOf<CalendarSlot>();
    expectTypeOf<
      CalledWith<Meeting>["range"]
    >().toEqualTypeOf<CalendarDropRange>();
    expectTypeOf<
      CalledWith<Meeting>["header"]
    >().toEqualTypeOf<HeaderRendererProps>();
  });
});
