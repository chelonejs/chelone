import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calendarRange } from "./calendar-dates";
import {
  type CalendarEvent,
  calendarEventsInHour,
  calendarEventsOnDay,
  calendarRangeFilter,
  groupCalendarAgenda,
  moveCalendarEvent,
  omitCalendarRangeFilter,
  staleCalendarRangeKeys,
  toCalendarEvents,
} from "./calendar-events";

interface Task {
  id: number;
  name?: string;
  from?: unknown;
  to?: unknown;
  kind?: string;
}

const event = (
  id: number,
  start: Date,
  end?: Date,
): CalendarEvent<{ id: number }> => ({
  record: { id },
  start,
  end,
  title: `Event ${id}`,
});

const ids = (events: CalendarEvent<{ id: number }>[]) =>
  events.map((e) => e.record.id);

describe("toCalendarEvents", () => {
  const options = {
    startSource: "from",
    endSource: "to",
    getTitle: (task: Task) => `Task ${task.id}`,
  };

  it("skips records with no usable start and drops an end before the start", () => {
    const records: Task[] = [
      { id: 1, from: "2026-05-01", to: "2026-05-03" },
      { id: 2 },
      { id: 3, from: "garbage" },
      { id: 4, from: "2026-05-05T10:00:00", to: "2026-05-05T09:00:00" },
      { id: 5, from: "2026-05-06", to: "nope" },
    ];
    const events = toCalendarEvents(records, options);
    expect(events.map((e) => e.record.id)).toEqual([1, 4, 5]);
    expect(events[0]?.start).toEqual(new Date(2026, 4, 1));
    expect(events[0]?.end).toEqual(new Date(2026, 4, 3));
    expect(events[1]?.end).toBeUndefined();
    expect(events[2]?.end).toBeUndefined();
    expect(events[0]?.record).toBe(records[0]);
  });

  it("takes the title from titleSource, else getTitle, and the color from colorMap", () => {
    const records: Task[] = [
      { id: 1, from: "2026-05-01", name: "Launch", kind: "work" },
      { id: 2, from: "2026-05-02", name: "", kind: "other" },
      { id: 3, from: "2026-05-03" },
    ];
    const events = toCalendarEvents(records, {
      ...options,
      titleSource: "name",
      colorSource: "kind",
      colorMap: { work: "blue" },
    });
    expect(events.map((e) => e.title)).toEqual(["Launch", "Task 2", "Task 3"]);
    expect(events.map((e) => e.color)).toEqual(["blue", undefined, undefined]);
  });

  it("does not mutate the records", () => {
    const records: Task[] = [{ id: 1, from: "2026-05-01" }];
    toCalendarEvents(records, options);
    expect(records).toEqual([{ id: 1, from: "2026-05-01" }]);
  });
});

describe("calendarEventsOnDay", () => {
  it("lists a multi-day event on each day it covers", () => {
    const trip = event(1, new Date(2026, 4, 4, 15), new Date(2026, 4, 6, 10));
    const single = event(2, new Date(2026, 4, 5, 9));
    const events = [trip, single];
    expect(ids(calendarEventsOnDay(events, new Date(2026, 4, 3)))).toEqual([]);
    expect(ids(calendarEventsOnDay(events, new Date(2026, 4, 4, 22)))).toEqual([
      1,
    ]);
    expect(ids(calendarEventsOnDay(events, new Date(2026, 4, 5)))).toEqual([
      1, 2,
    ]);
    expect(ids(calendarEventsOnDay(events, new Date(2026, 4, 6)))).toEqual([1]);
    expect(ids(calendarEventsOnDay(events, new Date(2026, 4, 7)))).toEqual([]);
  });

  it("does not list an event on the day it ends at midnight", () => {
    const overnight = event(
      1,
      new Date(2026, 4, 4, 22),
      new Date(2026, 4, 5, 0, 0),
    );
    const allDay = event(2, new Date(2026, 4, 4), new Date(2026, 4, 5));
    const events = [overnight, allDay];
    expect(ids(calendarEventsOnDay(events, new Date(2026, 4, 4)))).toEqual([
      1, 2,
    ]);
    expect(ids(calendarEventsOnDay(events, new Date(2026, 4, 5)))).toEqual([]);
  });

  it("lists an event that starts and ends at the same midnight on its day", () => {
    const instant = event(1, new Date(2026, 4, 4), new Date(2026, 4, 4));
    expect(ids(calendarEventsOnDay([instant], new Date(2026, 4, 4)))).toEqual([
      1,
    ]);
  });
});

describe("calendarEventsInHour", () => {
  it("matches by the hour of the start", () => {
    const events = [
      event(1, new Date(2026, 4, 4, 9, 0), new Date(2026, 4, 4, 12)),
      event(2, new Date(2026, 4, 4, 9, 59)),
      event(3, new Date(2026, 4, 4, 10)),
      event(4, new Date(2026, 4, 5, 9)),
    ];
    expect(ids(calendarEventsInHour(events, new Date(2026, 4, 4), 9))).toEqual([
      1, 2,
    ]);
    expect(ids(calendarEventsInHour(events, new Date(2026, 4, 4), 11))).toEqual(
      [],
    );
  });
});

describe("groupCalendarAgenda", () => {
  it("groups by day, sorts by start and ignores events outside the range", () => {
    const range = calendarRange("agenda", new Date(2026, 4, 15), 0);
    const events = [
      event(1, new Date(2026, 4, 16, 14)),
      event(2, new Date(2026, 4, 15, 9)),
      event(3, new Date(2026, 4, 16, 8)),
      event(4, new Date(2026, 6, 1)),
      event(5, new Date(2026, 4, 15, 9)),
      event(6, new Date(2026, 0, 1)),
    ];
    const groups = groupCalendarAgenda(events, range);
    expect(groups.map((g) => g.key)).toEqual(["2026-05-15", "2026-05-16"]);
    expect(groups.map((g) => g.day)).toEqual([
      new Date(2026, 4, 15),
      new Date(2026, 4, 16),
    ]);
    expect(groups.map((g) => ids(g.events))).toEqual([
      [2, 5],
      [3, 1],
    ]);
    expect(ids(events)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("moveCalendarEvent", () => {
  it("keeps the time of day and the duration", () => {
    const meeting = event(
      1,
      new Date(2026, 4, 4, 14, 30),
      new Date(2026, 4, 4, 15, 45),
    );
    const moved = moveCalendarEvent(
      meeting,
      new Date(2026, 4, 4),
      new Date(2026, 4, 9),
    );
    expect(moved.start).toEqual(new Date(2026, 4, 9, 14, 30));
    expect(moved.end).toEqual(new Date(2026, 4, 9, 15, 45));
    expect(meeting.start).toEqual(new Date(2026, 4, 4, 14, 30));
  });

  it("leaves out the end of an event that has none", () => {
    const moved = moveCalendarEvent(
      event(1, new Date(2026, 4, 4, 14)),
      new Date(2026, 4, 4),
      new Date(2026, 4, 3),
    );
    expect(moved).toEqual({ start: new Date(2026, 4, 3, 14) });
    expect("end" in moved).toBe(false);
  });

  it("moves a multi-day event by the days between the grabbed day and the drop day", () => {
    const trip = event(1, new Date(2026, 4, 4, 15), new Date(2026, 4, 7, 10));
    // Grabbed on its second day (May 5) and dropped on May 12: seven days.
    const moved = moveCalendarEvent(
      trip,
      new Date(2026, 4, 5),
      new Date(2026, 4, 12),
    );
    expect(moved.start).toEqual(new Date(2026, 4, 11, 15));
    expect(moved.end).toEqual(new Date(2026, 4, 14, 10));
  });
});

describe("moveCalendarEvent across a daylight saving change", () => {
  const previousTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  });

  it("keeps an all-day event ending at midnight", () => {
    // New York springs forward on 2026-03-08 and falls back on 2026-11-01.
    const allDay = event(1, new Date(2026, 2, 7), new Date(2026, 2, 8));
    const spring = moveCalendarEvent(
      allDay,
      new Date(2026, 2, 7),
      new Date(2026, 2, 8),
    );
    expect(spring.start).toEqual(new Date(2026, 2, 8));
    expect(spring.end).toEqual(new Date(2026, 2, 9));

    const fall = moveCalendarEvent(
      allDay,
      new Date(2026, 2, 7),
      new Date(2026, 10, 1),
    );
    expect(fall.start).toEqual(new Date(2026, 10, 1));
    expect(fall.end).toEqual(new Date(2026, 10, 2));
  });
});

describe("calendarRangeFilter", () => {
  const range = {
    start: new Date("2026-04-26T00:00:00.000Z"),
    end: new Date("2026-05-30T23:59:59.999Z"),
  };

  it("without an endSource bounds the start on both sides", () => {
    expect(calendarRangeFilter("starts_at", range)).toEqual({
      starts_at_gte: "2026-04-26T00:00:00.000Z",
      starts_at_lte: "2026-05-30T23:59:59.999Z",
    });
  });

  it("with an endSource keeps an event that starts before the range and ends inside it", () => {
    expect(calendarRangeFilter("starts_at", range, "ends_at")).toEqual({
      starts_at_lte: "2026-05-30T23:59:59.999Z",
      ends_at_gte: "2026-04-26T00:00:00.000Z",
    });
  });

  it("staleCalendarRangeKeys names the start lower bound only once an endSource replaces it", () => {
    expect(staleCalendarRangeKeys("starts_at")).toEqual([]);
    expect(staleCalendarRangeKeys("starts_at", "ends_at")).toEqual([
      "starts_at_gte",
    ]);
  });

  it("omitCalendarRangeFilter removes only the range keys", () => {
    const merged = {
      ...calendarRangeFilter("starts_at", range),
      status: "open",
      ends_at_gte: "x",
    };
    expect(omitCalendarRangeFilter(merged, "starts_at")).toEqual({
      status: "open",
      ends_at_gte: "x",
    });
    expect(Object.keys(merged)).toHaveLength(4);
  });

  it("omitCalendarRangeFilter with an endSource also removes the end key", () => {
    const merged = {
      ...calendarRangeFilter("starts_at", range, "ends_at"),
      status: "open",
      starts_at_gte: "kept?",
    };
    expect(omitCalendarRangeFilter(merged, "starts_at", "ends_at")).toEqual({
      status: "open",
    });
  });
});
