import { describe, expect, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import { formatRelativeTime, toTimelineEntries } from "./record-timeline";

type Row = LooseRecord & { id: number | string };

const options = { messageSource: "message", timestampSource: "at" } as const;

describe("toTimelineEntries", () => {
  it("returns an entry per record in list order", () => {
    const records: Row[] = [
      { id: 3, message: "c", at: "2026-03-01" },
      { id: 1, message: "a", at: "2026-01-01" },
      { id: 2, message: "b", at: "2026-02-01" },
    ];
    const entries = toTimelineEntries(records, options);
    expect(entries.map((entry) => entry.id)).toEqual([3, 1, 2]);
    expect(entries.map((entry) => entry.message)).toEqual(["c", "a", "b"]);
    expect(entries[0]?.record).toBe(records[0]);
  });

  it("reads message, user and icon as strings by path", () => {
    const records: Row[] = [
      {
        id: 1,
        body: { text: "Shipped" },
        by: { name: "Ada" },
        kind: 7,
        at: 0,
      },
    ];
    const [entry] = toTimelineEntries(records, {
      messageSource: "body.text",
      timestampSource: "at",
      userSource: "by.name",
      iconSource: "kind",
    });
    expect(entry?.message).toBe("Shipped");
    expect(entry?.user).toBe("Ada");
    expect(entry?.icon).toBe("7");
  });

  it("a null message is the empty string and a null or empty user or icon is undefined", () => {
    const records: Row[] = [
      { id: 1, message: null, user: null, icon: "", at: 0 },
      { id: 2, user: "", icon: null, at: 0 },
    ];
    const entries = toTimelineEntries(records, {
      ...options,
      userSource: "user",
      iconSource: "icon",
    });
    for (const entry of entries) {
      expect(entry.message).toBe("");
      expect(entry.user).toBeUndefined();
      expect(entry.icon).toBeUndefined();
    }
  });

  it("leaves user and icon undefined when their sources are unset", () => {
    const records: Row[] = [
      { id: 1, message: "a", user: "Ada", icon: "x", at: 0 },
    ];
    const [entry] = toTimelineEntries(records, options);
    expect(entry?.user).toBeUndefined();
    expect(entry?.icon).toBeUndefined();
  });

  it("parses ISO strings, numbers and Date values, and an invalid date is undefined", () => {
    const moment = new Date(2026, 4, 1, 12, 30);
    const records: Row[] = [
      { id: 1, at: "2026-05-01T10:00:00.000Z" },
      { id: 2, at: moment.getTime() },
      { id: 3, at: moment },
      { id: 4, at: "not a date" },
      { id: 5, at: null },
      { id: 6 },
      { id: 7, at: "2026-05-01" },
    ];
    const dates = toTimelineEntries(records, options).map(
      (entry) => entry.date,
    );
    expect(dates[0]?.toISOString()).toBe("2026-05-01T10:00:00.000Z");
    expect(dates[1]).toEqual(moment);
    expect(dates[2]).toEqual(moment);
    expect(dates[3]).toBeUndefined();
    expect(dates[4]).toBeUndefined();
    expect(dates[5]).toBeUndefined();
    expect(dates[6]).toEqual(new Date(2026, 4, 1));
  });

  it("does not mutate the records", () => {
    const records: Row[] = [
      { id: 2, message: "b", at: "2026-02-01", by: "Ada" },
      { id: 1, message: "a", at: "2026-01-01", by: "Bo" },
    ];
    const before = structuredClone(records);
    const list = [...records];
    toTimelineEntries(list, { ...options, userSource: "by" });
    expect(records).toEqual(before);
    expect(list).toEqual(records);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0);
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it("picks seconds, minutes, hours, days or months by distance", () => {
    expect(formatRelativeTime(ago(30), now, "en")).toBe("30 seconds ago");
    expect(formatRelativeTime(ago(59), now, "en")).toBe("59 seconds ago");
    expect(formatRelativeTime(ago(60), now, "en")).toBe("1 minute ago");
    expect(formatRelativeTime(ago(3599), now, "en")).toBe("60 minutes ago");
    expect(formatRelativeTime(ago(3600), now, "en")).toBe("1 hour ago");
    expect(formatRelativeTime(ago(86399), now, "en")).toBe("24 hours ago");
    expect(formatRelativeTime(ago(86400 * 3), now, "en")).toBe("3 days ago");
    expect(formatRelativeTime(ago(86400 * 29), now, "en")).toBe("29 days ago");
    expect(formatRelativeTime(ago(86400 * 30), now, "en")).toBe("last month");
    expect(formatRelativeTime(ago(86400 * 90), now, "en")).toBe("3 months ago");
  });

  it("formats past and future times in the given locale", () => {
    expect(formatRelativeTime(ago(7200), now, "en")).toBe("2 hours ago");
    expect(formatRelativeTime(ago(-7200), now, "en")).toBe("in 2 hours");
    expect(formatRelativeTime(ago(7200), now, "fr")).toBe("il y a 2 heures");
    expect(formatRelativeTime(ago(-7200), now, "fr")).toBe("dans 2 heures");
    expect(formatRelativeTime(now, now, "en")).toBe("now");
  });
});
