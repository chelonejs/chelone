/**
 * The date, date-time and time format and parse helpers live in
 * `@chelone/core`; this file keeps the three SFCs' import path, and the class
 * they share.
 */

/** The native picker icon: right-aligned, and visible on a dark theme. */
export const PICKER_INPUT_CLASS =
  "scheme-light dark:scheme-dark relative [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:opacity-100 appearance-none";

export {
  formatDate,
  formatDateTime,
  formatTime,
  isValidDate,
  isValidDateTime,
  isValidTime,
  parseDateTimeToISO,
  parseTimeToDate,
} from "@chelone/core";
