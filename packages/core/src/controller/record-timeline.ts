/**
 * Pure rules for a record timeline. No react, no vue: both RecordTimeline
 * adapters read the same entries from the same records and print the same
 * relative time text.
 */

import { getAtPath } from "../resource/get-at-path";
import type { Identifier } from "../resource/identifier";
import type { SourcePath } from "../resource/source-path";
import { parseCalendarDate } from "./calendar-dates";

export interface RecordTimelineEntry<R> {
  id: Identifier;
  record: R;
  message: string;
  /** `undefined` when the timestamp is missing or not a valid date. */
  date: Date | undefined;
  user: string | undefined;
  icon: string | undefined;
}

export interface ToTimelineEntriesOptions<R> {
  messageSource: SourcePath<R>;
  timestampSource: SourcePath<R>;
  userSource?: SourcePath<R>;
  iconSource?: SourcePath<R>;
}

/**
 * One entry per record, in list order: the data provider's sort decides the
 * order, and the records are not changed.
 */
export function toTimelineEntries<R extends { id: Identifier }>(
  records: readonly R[],
  options: ToTimelineEntriesOptions<R>,
): RecordTimelineEntry<R>[] {
  const { messageSource, timestampSource, userSource, iconSource } = options;
  return records.map((record) => {
    const message = getAtPath(record, messageSource);
    const user =
      userSource === undefined ? undefined : getAtPath(record, userSource);
    const icon =
      iconSource === undefined ? undefined : getAtPath(record, iconSource);
    return {
      id: record.id,
      record,
      message: message == null ? "" : String(message),
      date: parseCalendarDate(getAtPath(record, timestampSource)),
      user: user == null || user === "" ? undefined : String(user),
      icon: icon == null || icon === "" ? undefined : String(icon),
    };
  });
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const MONTH = DAY * 30;

/**
 * "2 hours ago" or "in 3 days", from the distance between `date` and `now`
 * in whole seconds, minutes, hours, days or 30-day months. It takes `now` so
 * a caller decides what the present is.
 */
export function formatRelativeTime(
  date: Date,
  now: Date,
  locale?: string,
): string {
  const delta = (date.getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const distance = Math.abs(delta);
  if (distance < MINUTE) return rtf.format(Math.round(delta), "second");
  if (distance < HOUR) return rtf.format(Math.round(delta / MINUTE), "minute");
  if (distance < DAY) return rtf.format(Math.round(delta / HOUR), "hour");
  if (distance < MONTH) return rtf.format(Math.round(delta / DAY), "day");
  return rtf.format(Math.round(delta / MONTH), "month");
}
