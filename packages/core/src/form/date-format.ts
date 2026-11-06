/**
 * Pure date, date-time and time format and parse helpers shared by the React and
 * Vue `<DateInput>`, `<DateTimeInput>` and `<TimeInput>`, so both adapters
 * format and validate a value the same way.
 */

import type { DateInputValue } from "./input-values";

const leftPad2 = (value: number): string => `00${value}`.slice(-2);
const leftPad4 = (value: number): string => `0000${value}`.slice(-4);

// --- date ("YYYY-MM-DD") ---------------------------------------------------

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Convert a `Date` to a local "YYYY-MM-DD" string, or "" for an invalid date. */
function dateToYmd(value: Date): string {
  if (!(value instanceof Date) || Number.isNaN(value.getDate())) return "";
  const yyyy = value.getFullYear().toString();
  const MM = leftPad2(value.getMonth() + 1);
  const dd = leftPad2(value.getDate());
  return `${yyyy}-${MM}-${dd}`;
}

/**
 * Format a form value (string / ISO / `Date` / timestamp / "") to a bare
 * "YYYY-MM-DD" string for `<input type="date">`. Returns `null` for nullish/empty.
 */
export function formatDate(value: DateInputValue): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return dateToYmd(value);
  if (typeof value === "string" && dateRegex.test(value)) return value;
  return dateToYmd(new Date(value));
}

/** Whether a raw `<input type="date">` string is empty or a valid date. */
export function isValidDate(raw: string): boolean {
  if (raw === "") return true;
  return dateRegex.test(raw) && !Number.isNaN(new Date(raw).getTime());
}

// --- datetime-local ("yyyy-MM-ddThh:mm") -----------------------------------

const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Convert a `Date` to a local "yyyy-MM-ddThh:mm" string, or "" if invalid. */
function dateToLocalDateTime(value: Date): string {
  if (!(value instanceof Date) || Number.isNaN(value.getDate())) return "";
  const yyyy = leftPad4(value.getFullYear());
  const MM = leftPad2(value.getMonth() + 1);
  const dd = leftPad2(value.getDate());
  const hh = leftPad2(value.getHours());
  const mm = leftPad2(value.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

/**
 * Format a form value (ISO string / `Date` / timestamp) to the local
 * `datetime-local` display string. Empty → "" (keeps the input controlled).
 */
export function formatDateTime(value: DateInputValue): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return dateToLocalDateTime(value);
  if (typeof value === "string" && dateTimeRegex.test(value)) return value;
  return dateToLocalDateTime(new Date(value));
}

/**
 * Parse a local `datetime-local` string back to an ISO 8601 string (browser
 * timezone). Returns `null` for empty/unparseable so a required validator fires.
 */
export function parseDateTimeToISO(value: string): string | null {
  if (value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Whether a raw `datetime-local` string is empty or parses to a valid date. */
export function isValidDateTime(raw: string): boolean {
  if (raw === "") return true;
  return !Number.isNaN(new Date(raw).getTime());
}

// --- time ("HH:mm") --------------------------------------------------------

// "HH:mm" or "HH:mm:ss"
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

/** Convert a `Date` to a local "HH:mm" string, or "" if invalid. */
function dateToHm(value: Date): string {
  if (!(value instanceof Date) || Number.isNaN(value.getDate())) return "";
  const hh = leftPad2(value.getHours());
  const mm = leftPad2(value.getMinutes());
  return `${hh}:${mm}`;
}

/**
 * Format a form value (`Date` / "HH:mm" string) to the "HH:mm" display string.
 * Empty → "" (keeps the input controlled).
 */
export function formatTime(value: DateInputValue): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return dateToHm(value);
  if (typeof value === "string" && timeRegex.test(value)) return value;
  return dateToHm(new Date(value));
}

/**
 * Parse a "HH:mm"/"HH:mm:ss" string to a `Date` (today at that local time), for
 * dataProvider compatibility. Returns `null` for empty/unparseable so a required
 * validator still fires.
 */
export function parseTimeToDate(value: string): Date | null {
  if (timeRegex.test(value)) {
    const [hh = "0", mm = "0", ss = "0"] = value.split(":");
    const d = new Date();
    d.setHours(
      Number.parseInt(hh, 10),
      Number.parseInt(mm, 10),
      Number.parseInt(ss, 10),
      0,
    );
    return d;
  }
  return null;
}

/** Whether a raw `<input type="time">` string is empty or a valid time. */
export function isValidTime(raw: string): boolean {
  return raw === "" || timeRegex.test(raw);
}
