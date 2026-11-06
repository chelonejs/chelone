import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatTime,
  isValidDate,
  isValidDateTime,
  isValidTime,
  parseDateTimeToISO,
  parseTimeToDate,
} from "./date-format";

describe("formatDate", () => {
  it.each([
    ["null", null, null],
    ['""', "", null],
    ["a bare date string", "2024-03-05", "2024-03-05"],
    ["an ISO string", "2024-03-05T10:20:30", "2024-03-05"],
    ["a timestamp", new Date(2024, 2, 5, 10).getTime(), "2024-03-05"],
    ["a Date", new Date(2024, 2, 5, 10), "2024-03-05"],
  ])(
    'formatDate maps null, "", a bare date string, an ISO string, a timestamp and a Date (%s)',
    (_label, input, expected) => {
      expect(formatDate(input)).toBe(expected);
    },
  );

  it('formatDate gives "" for an invalid Date and keeps a three-digit year unpadded', () => {
    expect(formatDate(new Date(Number.NaN))).toBe("");
    const early = new Date(2000, 0, 1);
    early.setFullYear(999);
    expect(formatDate(early)).toBe("999-01-01");
  });
});

describe("formatDateTime", () => {
  it('formatDateTime pads the year to four digits and gives "" for an invalid Date', () => {
    const early = new Date(2000, 0, 1, 0, 0);
    early.setFullYear(999);
    expect(formatDateTime(early)).toBe("0999-01-01T00:00");
    expect(formatDateTime(new Date(Number.NaN))).toBe("");
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime("2024-03-05T09:05")).toBe("2024-03-05T09:05");
    expect(formatDateTime(new Date(2024, 2, 5, 9, 5))).toBe("2024-03-05T09:05");
  });
});

describe("formatTime", () => {
  it('formatTime maps null, "", "09:05", "09:05:30" and a Date', () => {
    expect(formatTime(null)).toBe("");
    expect(formatTime("")).toBe("");
    expect(formatTime("09:05")).toBe("09:05");
    expect(formatTime("09:05:30")).toBe("09:05:30");
    expect(formatTime(new Date(2024, 2, 5, 9, 5, 30))).toBe("09:05");
  });
});

describe("parsers", () => {
  it("parseDateTimeToISO and parseTimeToDate return null for empty and unparseable input", () => {
    expect(parseDateTimeToISO("")).toBeNull();
    expect(parseDateTimeToISO("not a date")).toBeNull();
    expect(parseDateTimeToISO("2024-03-05T09:05")).toBe(
      new Date(2024, 2, 5, 9, 5).toISOString(),
    );
    expect(parseTimeToDate("")).toBeNull();
    expect(parseTimeToDate("9:5")).toBeNull();
    const parsed = parseTimeToDate("09:05:30");
    expect(parsed?.getHours()).toBe(9);
    expect(parsed?.getMinutes()).toBe(5);
    expect(parsed?.getSeconds()).toBe(30);
  });
});

describe("validity", () => {
  it('isValidDate, isValidDateTime and isValidTime accept "" and refuse malformed strings', () => {
    expect(isValidDate("")).toBe(true);
    expect(isValidDateTime("")).toBe(true);
    expect(isValidTime("")).toBe(true);
    expect(isValidDate("2024-03-05")).toBe(true);
    expect(isValidDateTime("2024-03-05T09:05")).toBe(true);
    expect(isValidTime("09:05")).toBe(true);
    expect(isValidTime("09:05:30")).toBe(true);
    expect(isValidDate("2024-3-5")).toBe(false);
    expect(isValidDate("2024-13-45")).toBe(false);
    expect(isValidDateTime("nope")).toBe(false);
    expect(isValidTime("9:05")).toBe(false);
  });
});
