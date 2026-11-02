import { describe, expect, it } from "vitest";
import { type RecentEntry, recentsKey, rememberRecent } from "./recents";

const record = (id: string | number, label = `Post ${id}`): RecentEntry => ({
  type: "record",
  resource: "posts",
  id,
  label,
});

describe("recentsKey", () => {
  it("is the key shadmin stored recents under", () => {
    expect(recentsKey).toBe("command-menu.recents");
  });
});

describe("rememberRecent", () => {
  it("puts the newest entry first", () => {
    const recents = rememberRecent([record(1)], record(2), 5);
    expect(recents.map((entry) => entry.id)).toEqual([2, 1]);
  });

  it('replaces an earlier entry for the same record, and 1 equals "1"', () => {
    const recents = rememberRecent(
      [record(2), record(1, "Old label")],
      record("1", "New label"),
      5,
    );
    expect(recents).toEqual([record("1", "New label"), record(2)]);
  });

  it("keeps a resource entry and a record entry of the same resource apart", () => {
    const resource: RecentEntry = {
      type: "resource",
      resource: "posts",
      label: "Posts",
    };
    const recents = rememberRecent([record(1)], resource, 5);
    expect(recents).toEqual([resource, record(1)]);
    expect(rememberRecent(recents, resource, 5)).toEqual([resource, record(1)]);
  });

  it("cuts to the limit and returns an empty list below 1", () => {
    const recents = [record(1), record(2), record(3)];
    expect(rememberRecent(recents, record(4), 3).map((e) => e.id)).toEqual([
      4, 1, 2,
    ]);
    expect(rememberRecent(recents, record(4), 0)).toEqual([]);
    expect(rememberRecent(recents, record(4), -1)).toEqual([]);
  });

  it("does not mutate the list it was given", () => {
    const recents = [record(1)];
    rememberRecent(recents, record(2), 5);
    expect(recents).toEqual([record(1)]);
  });
});
