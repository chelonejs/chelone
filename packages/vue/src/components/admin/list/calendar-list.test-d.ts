/**
 * `<CalendarList>` is typed by its record: the record reaches each view, each
 * emit and the `#event` slot, so a listener is handed the app's record and not
 * a loose one.
 */

import type {
  CalendarEvent,
  LooseRecord,
  ResourceRecord,
  SourceProp,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { CalendarAgendaViewProps } from "./calendar-agenda-view.vue";
import type { CalendarEventProps } from "./calendar-event.vue";
import type CalendarList from "./calendar-list.vue";
import type { CalendarListProps } from "./calendar-list.vue";
import type {
  CalendarEventSlotProps,
  CalendarMonthViewProps,
} from "./calendar-month-view.vue";
import type { CalendarWeekViewProps } from "./calendar-week-view.vue";

type Meeting = {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  kind: string;
};

/** What a `<CalendarList>` over `TRecord` hands its listeners and slots. */
type Handed<RecordType extends ResourceRecord> = NonNullable<
  Parameters<typeof CalendarList<RecordType>>[1]
>;

type SlotProps<RecordType extends ResourceRecord> = Parameters<
  NonNullable<Handed<RecordType>["slots"]["event"]>
>[0];

const meeting: Meeting = {
  id: 1,
  title: "Kickoff",
  starts_at: "2026-05-04T09:00:00",
  ends_at: "2026-05-04T10:00:00",
  kind: "work",
};

describe("CalendarList record", () => {
  it("an event callback receives the list's record", () => {
    expectTypeOf<Handed<Meeting>["emit"]>().toBeCallableWith(
      "selectEvent",
      meeting,
    );
    expectTypeOf<Handed<Meeting>["emit"]>().toBeCallableWith("drop", meeting, {
      start: "2026-05-04T09:00:00",
    });
    expectTypeOf<SlotProps<Meeting>>().toEqualTypeOf<
      CalendarEventSlotProps<Meeting>
    >();
    expectTypeOf<SlotProps<Meeting>["record"]>().toEqualTypeOf<Meeting>();
    expectTypeOf<SlotProps<Meeting>>().toExtend<CalendarEvent<Meeting>>();
  });

  it("a listener handed another record is rejected", () => {
    // @ts-expect-error `select-event` carries Meeting, not any record with an id
    expectTypeOf<Handed<Meeting>["emit"]>().toBeCallableWith("selectEvent", {
      id: 1,
    });
    expectTypeOf<
      SlotProps<Meeting>["record"]
    >().not.toEqualTypeOf<LooseRecord>();
  });

  it("each view takes the record its list is typed over", () => {
    expectTypeOf<CalendarMonthViewProps<Meeting>["events"]>().toEqualTypeOf<
      CalendarEvent<Meeting>[]
    >();
    expectTypeOf<CalendarWeekViewProps<Meeting>["events"]>().toEqualTypeOf<
      CalendarEvent<Meeting>[]
    >();
    expectTypeOf<CalendarAgendaViewProps<Meeting>["events"]>().toEqualTypeOf<
      CalendarEvent<Meeting>[]
    >();
    expectTypeOf<CalendarMonthViewProps<Meeting>["hrefFor"]>()
      .parameter(0)
      .toEqualTypeOf<Meeting>();
    expectTypeOf<CalendarEventProps<Meeting>["event"]>().toEqualTypeOf<
      CalendarEvent<Meeting>
    >();
    expectTypeOf<CalendarListProps<Meeting>["startSource"]>().toEqualTypeOf<
      SourceProp<Meeting>
    >();
  });
});
