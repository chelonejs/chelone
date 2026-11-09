import type { FilterPayload, LooseFilterPayload } from "../data/types";
import { getAtPath } from "../resource/get-at-path";
import type { LooseRecord } from "../resource/record";
import type { FilterSourceKey, SourcePath } from "../resource/source-path";
import {
  type CalendarRange,
  calendarDayKey,
  parseCalendarDate,
} from "./calendar-dates";

export interface CalendarEvent<R> {
  record: R;
  start: Date;
  end?: Date;
  title: string;
  color?: string;
}

export interface ToCalendarEventsOptions<R> {
  startSource: SourcePath<R>;
  endSource?: SourcePath<R>;
  titleSource?: SourcePath<R>;
  colorSource?: SourcePath<R>;
  /** Maps the value at `colorSource` to a color. */
  colorMap?: Record<string, string>;
  /** The title when `titleSource` is unset or empty: the adapter fills it from the record representation. */
  getTitle: (record: R) => string;
}

const midnight = (date: Date, dayOffset = 0): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset);

const isMidnight = (date: Date) => date.getTime() === midnight(date).getTime();

/** Records with no usable start are skipped, and an end before the start is dropped. */
export function toCalendarEvents<R>(
  records: readonly R[],
  options: ToCalendarEventsOptions<R>,
): CalendarEvent<R>[] {
  const events: CalendarEvent<R>[] = [];
  for (const record of records) {
    const start = parseCalendarDate(getAtPath(record, options.startSource));
    if (!start) continue;

    const parsedEnd = options.endSource
      ? parseCalendarDate(getAtPath(record, options.endSource))
      : undefined;
    const end =
      parsedEnd && parsedEnd.getTime() >= start.getTime()
        ? parsedEnd
        : undefined;

    const titleValue = options.titleSource
      ? getAtPath(record, options.titleSource)
      : undefined;
    const title =
      (typeof titleValue === "string" || typeof titleValue === "number") &&
      titleValue !== ""
        ? String(titleValue)
        : options.getTitle(record);

    const colorValue = options.colorSource
      ? getAtPath(record, options.colorSource)
      : undefined;
    const color =
      colorValue == null ? undefined : options.colorMap?.[String(colorValue)];

    const event: CalendarEvent<R> = { record, start, title };
    if (end) event.end = end;
    if (color !== undefined) event.color = color;
    events.push(event);
  }
  return events;
}

/** An event runs from its start day to its end day; an end at midnight leaves its own day out. */
export function calendarEventsOnDay<R>(
  events: readonly CalendarEvent<R>[],
  day: Date,
): CalendarEvent<R>[] {
  const dayTime = midnight(day).getTime();
  return events.filter(({ start, end }) => {
    const firstDay = midnight(start).getTime();
    let lastDay = firstDay;
    if (end && end.getTime() > start.getTime()) {
      lastDay = midnight(end, isMidnight(end) ? -1 : 0).getTime();
    }
    return dayTime >= firstDay && dayTime <= lastDay;
  });
}

export function calendarEventsInHour<R>(
  events: readonly CalendarEvent<R>[],
  day: Date,
  hour: number,
): CalendarEvent<R>[] {
  const key = calendarDayKey(day);
  return events.filter(
    ({ start }) => calendarDayKey(start) === key && start.getHours() === hour,
  );
}

export interface CalendarAgendaGroup<R> {
  day: Date;
  key: string;
  events: CalendarEvent<R>[];
}

/** Equal starts keep list order. */
export function groupCalendarAgenda<R>(
  events: readonly CalendarEvent<R>[],
  range: CalendarRange,
): CalendarAgendaGroup<R>[] {
  const inRange = events
    .filter(
      ({ start }) =>
        start.getTime() >= range.start.getTime() &&
        start.getTime() <= range.end.getTime(),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const groups: CalendarAgendaGroup<R>[] = [];
  const byKey = new Map<string, CalendarAgendaGroup<R>>();
  for (const event of inRange) {
    const key = calendarDayKey(event.start);
    let group = byKey.get(key);
    if (!group) {
      group = { day: midnight(event.start), key, events: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

const wholeDaysBetween = (from: Date, to: Date) =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  );

const addDays = (date: Date, days: number): Date =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );

/**
 * Shifts the start and the end by the whole days between the two days, each
 * keeping its time of day. Adding the duration in milliseconds instead would
 * move an all-day event's end off midnight when the move crosses a daylight
 * saving change.
 */
export function moveCalendarEvent<R>(
  event: CalendarEvent<R>,
  fromDay: Date,
  toDay: Date,
): { start: Date; end?: Date } {
  const days = wholeDaysBetween(fromDay, toDay);
  const start = addDays(event.start, days);
  return event.end ? { start, end: addDays(event.end, days) } : { start };
}

/**
 * The list filter that asks for a range. With an `endSource`, an event is kept
 * when it starts before the range ends and ends after it starts, so one that
 * began earlier and runs into the range is fetched; a record with an empty end
 * is then left out. Without one, only the start is bounded, on both sides.
 */
export function calendarRangeFilter<R = LooseRecord>(
  startSource: SourcePath<R>,
  range: CalendarRange,
  endSource?: SourcePath<R>,
): FilterPayload<R> {
  const filter = endSource
    ? {
        [`${startSource}_lte`]: range.end.toISOString(),
        [`${endSource}_gte`]: range.start.toISOString(),
      }
    : {
        [`${startSource}_gte`]: range.start.toISOString(),
        [`${startSource}_lte`]: range.end.toISOString(),
      };
  // type-escape: filter-value: a computed template key is typed `string`; each is `${path}_gte` or `${path}_lte`, the filter-key grammar
  return filter as FilterPayload<R>;
}

/**
 * Keys an earlier default filter wrote that the current one no longer does: a
 * list URL or store can still hold the start's lower bound, which would hide
 * the event that starts before the range.
 */
export function staleCalendarRangeKeys<R = LooseRecord>(
  startSource: SourcePath<R>,
  endSource?: SourcePath<R>,
): FilterSourceKey<R>[] {
  return endSource ? [`${startSource}_gte`] : [];
}

export function omitCalendarRangeFilter<R = LooseRecord>(
  filter: FilterPayload<R>,
  startSource: SourcePath<R>,
  endSource?: SourcePath<R>,
): FilterPayload<R> {
  const rest: LooseFilterPayload = { ...filter };
  delete rest[`${startSource}_gte`];
  delete rest[`${startSource}_lte`];
  if (endSource) delete rest[`${endSource}_gte`];
  // type-escape: filter-value: only keys of `filter` were copied, so `rest` holds a subset of its keys
  return rest as FilterPayload<R>;
}
