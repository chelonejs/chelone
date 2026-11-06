import { defined } from "@chelone/test-utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  calendarDayKey,
  calendarDays,
  calendarLabels,
  calendarRange,
  parseCalendarDate,
  shiftCalendarAnchor,
} from "./calendar-dates";

const plainSpaces = (text: string) => text.replace(/\s/g, " ");

describe("parseCalendarDate", () => {
  it("reads a date-only string as local midnight", () => {
    const date = parseCalendarDate("2026-05-01");
    expect(date).toEqual(new Date(2026, 4, 1, 0, 0, 0, 0));
  });

  it("reads ISO date-times, numbers and Dates and returns undefined for the rest", () => {
    expect(parseCalendarDate("2026-05-01T10:30:00Z")?.getTime()).toBe(
      Date.UTC(2026, 4, 1, 10, 30),
    );
    expect(parseCalendarDate(1_700_000_000_000)?.getTime()).toBe(
      1_700_000_000_000,
    );
    const input = new Date(2026, 4, 1, 9);
    const copy = parseCalendarDate(input);
    expect(copy).toEqual(input);
    expect(copy).not.toBe(input);

    expect(parseCalendarDate("")).toBeUndefined();
    expect(parseCalendarDate("not a date")).toBeUndefined();
    expect(parseCalendarDate("2026-02-30")).toBeUndefined();
    expect(parseCalendarDate("0050-03-01")?.getFullYear()).toBe(50);
    expect(parseCalendarDate(Number.NaN)).toBeUndefined();
    expect(parseCalendarDate(new Date(Number.NaN))).toBeUndefined();
    expect(parseCalendarDate(null)).toBeUndefined();
    expect(parseCalendarDate(undefined)).toBeUndefined();
    expect(parseCalendarDate({})).toBeUndefined();
  });
});

describe("calendarRange", () => {
  it("spans whole weeks for a month, starting on weekStartsOn", () => {
    // May 2026 starts on a Friday and ends on a Sunday.
    const sunday = calendarRange("month", new Date(2026, 4, 15, 13), 0);
    expect(sunday.start).toEqual(new Date(2026, 3, 26));
    expect(sunday.end).toEqual(new Date(2026, 5, 6, 23, 59, 59, 999));

    const monday = calendarRange("month", new Date(2026, 4, 15, 13), 1);
    expect(monday.start).toEqual(new Date(2026, 3, 27));
    expect(monday.end).toEqual(new Date(2026, 4, 31, 23, 59, 59, 999));
  });

  it("spans the anchor's week and 14 days either side for the agenda", () => {
    const week = calendarRange("week", new Date(2026, 4, 13, 9), 1);
    expect(week.start).toEqual(new Date(2026, 4, 11));
    expect(week.end).toEqual(new Date(2026, 4, 17, 23, 59, 59, 999));

    const agenda = calendarRange("agenda", new Date(2026, 4, 13, 9), 1);
    expect(agenda.start).toEqual(new Date(2026, 3, 29));
    expect(agenda.end).toEqual(new Date(2026, 4, 27, 23, 59, 59, 999));
  });

  it("does not mutate the anchor", () => {
    const anchor = new Date(2026, 4, 13, 9);
    calendarRange("month", anchor, 0);
    expect(anchor).toEqual(new Date(2026, 4, 13, 9));
  });
});

describe("calendarDays", () => {
  const previousTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  });

  it("returns one midnight per day across a daylight saving change", () => {
    // New York springs forward on 2026-03-08 and falls back on 2026-11-01.
    const spring = calendarDays(calendarRange("week", new Date(2026, 2, 8), 0));
    expect(spring.map(calendarDayKey)).toEqual([
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
    ]);
    const fall = calendarDays(calendarRange("week", new Date(2026, 10, 1), 0));
    expect(fall.map(calendarDayKey)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
    for (const day of [...spring, ...fall]) {
      expect([day.getHours(), day.getMinutes()]).toEqual([0, 0]);
    }
  });

  it("covers a month grid in whole weeks", () => {
    const days = calendarDays(calendarRange("month", new Date(2026, 4, 15), 1));
    expect(days).toHaveLength(35);
    expect(calendarDayKey(defined(days[0]))).toBe("2026-04-27");
    expect(calendarDayKey(defined(days[34]))).toBe("2026-05-31");
  });
});

describe("shiftCalendarAnchor", () => {
  it("steps a month, a week and a fortnight in both directions", () => {
    const anchor = new Date(2026, 4, 15, 10, 30);
    expect(shiftCalendarAnchor("month", anchor, 1)).toEqual(
      new Date(2026, 5, 15, 10, 30),
    );
    expect(shiftCalendarAnchor("month", anchor, -1)).toEqual(
      new Date(2026, 3, 15, 10, 30),
    );
    expect(shiftCalendarAnchor("week", anchor, 1)).toEqual(
      new Date(2026, 4, 22, 10, 30),
    );
    expect(shiftCalendarAnchor("week", anchor, -1)).toEqual(
      new Date(2026, 4, 8, 10, 30),
    );
    expect(shiftCalendarAnchor("agenda", anchor, 1)).toEqual(
      new Date(2026, 4, 29, 10, 30),
    );
    expect(shiftCalendarAnchor("agenda", anchor, -1)).toEqual(
      new Date(2026, 4, 1, 10, 30),
    );
    expect(anchor).toEqual(new Date(2026, 4, 15, 10, 30));
  });

  it("crosses a year boundary", () => {
    expect(shiftCalendarAnchor("month", new Date(2026, 11, 20), 1)).toEqual(
      new Date(2027, 0, 20),
    );
    expect(shiftCalendarAnchor("month", new Date(2026, 0, 20), -1)).toEqual(
      new Date(2025, 11, 20),
    );
  });

  it("clamps January 31st to the end of February", () => {
    expect(shiftCalendarAnchor("month", new Date(2026, 0, 31), 1)).toEqual(
      new Date(2026, 1, 28),
    );
    expect(shiftCalendarAnchor("month", new Date(2028, 0, 31), 1)).toEqual(
      new Date(2028, 1, 29),
    );
    expect(shiftCalendarAnchor("month", new Date(2026, 2, 31), -1)).toEqual(
      new Date(2026, 1, 28),
    );
  });
});

describe("calendarDayKey", () => {
  it("is the local yyyy-MM-dd", () => {
    expect(calendarDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("calendarLabels", () => {
  it("formats the month title, weekdays and hours for en and fr", () => {
    const anchor = new Date(2026, 4, 15);
    const range = calendarRange("month", anchor, 0);
    const en = calendarLabels("en");
    expect(en.title("month", anchor, range)).toBe("May 2026");
    expect(en.weekday(anchor)).toBe("Fri");
    expect(en.dayNumber(anchor)).toBe("15");
    expect(plainSpaces(en.hour(9))).toBe("9 AM");
    expect(plainSpaces(en.hour(15))).toBe("3 PM");
    expect(en.agendaDay(anchor)).toBe("Friday, May 15");

    const fr = calendarLabels("fr");
    expect(fr.title("month", anchor, range)).toBe("mai 2026");
    expect(fr.weekday(anchor)).toBe("ven.");
    expect(fr.dayNumber(anchor)).toBe("15");
    // ICU 79 (Node 26) drops the " h" that earlier ICU data appends.
    expect(plainSpaces(fr.hour(9))).toMatch(/^09( h)?$/);
    expect(fr.agendaDay(anchor)).toBe("vendredi 15 mai");
  });

  it("titles a week or agenda with the range it spans", () => {
    const anchor = new Date(2026, 4, 13);
    const range = calendarRange("week", anchor, 1);
    const title = plainSpaces(
      calendarLabels("en").title("week", anchor, range),
    );
    expect(title).toContain("May 11");
    expect(title).toContain("17, 2026");
  });
});
