export type CalendarView = "month" | "week" | "agenda";

/** 0 is Sunday, as in `Date#getDay`. */
export type CalendarWeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CalendarRange {
  /** Local midnight of the first day. */
  start: Date;
  /** The last millisecond of the last day. */
  end: Date;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const AGENDA_DAYS = 14;

const atMidnight = (date: Date, dayOffset = 0): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset);

const atEndOfDay = (date: Date, dayOffset = 0): Date =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + dayOffset,
    23,
    59,
    59,
    999,
  );

const daysFromWeekStart = (date: Date, weekStartsOn: CalendarWeekStart) =>
  (date.getDay() - weekStartsOn + 7) % 7;

/**
 * A date-only string is local midnight: `new Date("2026-05-01")` reads it as
 * UTC, which is the previous day west of Greenwich.
 */
export function parseCalendarDate(value: unknown): Date | undefined {
  let date: Date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "string") {
    const dateOnly = DATE_ONLY.exec(value);
    if (dateOnly) {
      const [year, month, day] = [
        Number(dateOnly[1]),
        Number(dateOnly[2]),
        Number(dateOnly[3]),
      ];
      date = new Date(year, month - 1, day);
      // `new Date(2026, 1, 30)` rolls over into March: reject it instead.
      if (date.getMonth() !== month - 1 || date.getDate() !== day) {
        return undefined;
      }
    } else {
      date = new Date(value);
    }
  } else {
    return undefined;
  }
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function calendarRange(
  view: CalendarView,
  anchor: Date,
  weekStartsOn: CalendarWeekStart,
): CalendarRange {
  if (view === "agenda") {
    return {
      start: atMidnight(anchor, -AGENDA_DAYS),
      end: atEndOfDay(anchor, AGENDA_DAYS),
    };
  }
  const first =
    view === "month"
      ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      : anchor;
  const last =
    view === "month"
      ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
      : anchor;
  return {
    start: atMidnight(first, -daysFromWeekStart(first, weekStartsOn)),
    end: atEndOfDay(last, 6 - daysFromWeekStart(last, weekStartsOn)),
  };
}

/** One local midnight per day: adding to the day of the month never skips or repeats a day when the clocks change. */
export function calendarDays(range: CalendarRange): Date[] {
  const days: Date[] = [];
  const first = atMidnight(range.start);
  for (
    let day = first;
    day.getTime() <= range.end.getTime();
    day = atMidnight(first, days.length)
  ) {
    days.push(day);
  }
  return days;
}

export function shiftCalendarAnchor(
  view: CalendarView,
  anchor: Date,
  direction: 1 | -1,
): Date {
  const time = [
    anchor.getHours(),
    anchor.getMinutes(),
    anchor.getSeconds(),
    anchor.getMilliseconds(),
  ] as const;
  if (view === "month") {
    const month = anchor.getMonth() + direction;
    const lastDay = new Date(anchor.getFullYear(), month + 1, 0).getDate();
    return new Date(
      anchor.getFullYear(),
      month,
      Math.min(anchor.getDate(), lastDay),
      ...time,
    );
  }
  const step = view === "week" ? 7 : AGENDA_DAYS;
  return new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + direction * step,
    ...time,
  );
}

const pad = (value: number) => String(value).padStart(2, "0");

export const calendarDayKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export interface CalendarLabels {
  title(view: CalendarView, anchor: Date, range: CalendarRange): string;
  weekday(date: Date): string;
  dayNumber(date: Date): string;
  hour(hour: number): string;
  agendaDay(date: Date): string;
}

export function calendarLabels(locale: string): CalendarLabels {
  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const span = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric" });
  const hour = new Intl.DateTimeFormat(locale, { hour: "numeric" });
  const agendaDay = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return {
    title: (view, anchor, range) =>
      view === "month"
        ? month.format(anchor)
        : span.formatRange(range.start, range.end),
    weekday: (date) => weekday.format(date),
    dayNumber: (date) => dayNumber.format(date),
    hour: (value) => hour.format(new Date(2000, 0, 1, value)),
    agendaDay: (date) => agendaDay.format(date),
  };
}
