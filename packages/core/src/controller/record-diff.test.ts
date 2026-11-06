import { describe, expect, it } from "vitest";
import { diffRecords, formatDiffValue } from "./record-diff";

interface Version {
  id: number;
  title: string;
  note: string;
  gone?: string;
  fresh?: string;
}

interface Cyclic {
  self?: Cyclic;
}

describe("diffRecords", () => {
  it("marks added, removed, changed and unchanged fields", () => {
    const before: Version = { id: 1, title: "Old", note: "kept", gone: "x" };
    const after: Version = { id: 1, title: "New", note: "kept", fresh: "y" };
    expect(
      diffRecords(before, after, ["id", "title", "gone", "fresh"]),
    ).toEqual([
      { source: "id", status: "unchanged", before: 1, after: 1 },
      { source: "title", status: "changed", before: "Old", after: "New" },
      { source: "gone", status: "removed", before: "x", after: undefined },
      { source: "fresh", status: "added", before: undefined, after: "y" },
    ]);
  });

  it("null and undefined both read as missing, and an empty string does not", () => {
    type Row = { a?: string | null; b?: string | null; c?: string | null };
    const rows = diffRecords<Row>(
      { a: null, b: undefined, c: "" },
      {
        a: undefined,
        b: null,
        c: "x",
      },
      ["a", "b", "c"],
    );
    expect(rows.map((row) => row.status)).toEqual([
      "unchanged",
      "unchanged",
      "changed",
    ]);
    expect(diffRecords<Row>({ a: null }, { a: "" }, ["a"])[0]?.status).toBe(
      "added",
    );
    expect(diffRecords<Row>({ a: "" }, { a: null }, ["a"])[0]?.status).toBe(
      "removed",
    );
    expect(diffRecords<Row>({ a: "" }, { a: "" }, ["a"])[0]?.status).toBe(
      "unchanged",
    );
  });

  it("objects with the same keys in another order, equal arrays and equal dates are unchanged", () => {
    const before = {
      obj: { a: 1, b: { c: 2, d: 3 } },
      list: [1, { x: 1, y: 2 }],
      at: new Date(0),
    };
    const after = {
      obj: { b: { d: 3, c: 2 }, a: 1 },
      list: [1, { y: 2, x: 1 }],
      at: new Date(0),
    };
    expect(diffRecords(before, after).map((row) => row.status)).toEqual([
      "unchanged",
      "unchanged",
      "unchanged",
    ]);
    expect(diffRecords({ list: [1, 2] }, { list: [2, 1] })[0]?.status).toBe(
      "changed",
    );
    expect(
      diffRecords({ at: new Date(0) }, { at: new Date(1) })[0]?.status,
    ).toBe("changed");
  });

  it("without sources lists the keys of before, then the keys only after has", () => {
    const rows = diffRecords<Record<string, number>>(
      { b: 1, a: 1 },
      { z: 3, a: 2, c: 3 },
    );
    expect(rows.map((row) => [row.source, row.status])).toEqual([
      ["b", "removed"],
      ["a", "changed"],
      ["z", "added"],
      ["c", "added"],
    ]);
  });

  it("sources pick and order the rows and read nested paths", () => {
    const before = { id: 1, author: { name: "Ann" }, tags: ["a"], other: 1 };
    const after = { id: 1, author: { name: "Bob" }, tags: ["a"], other: 2 };
    expect(diffRecords(before, after, ["tags[0]", "author.name"])).toEqual([
      { source: "tags[0]", status: "unchanged", before: "a", after: "a" },
      { source: "author.name", status: "changed", before: "Ann", after: "Bob" },
    ]);
  });

  it("does not mutate either record", () => {
    const before = { id: 1, nested: { a: [1, 2] }, at: new Date(0) };
    const after = { id: 1, nested: { a: [1, 3] }, at: new Date(5) };
    const beforeCopy = structuredClone(before);
    const afterCopy = structuredClone(after);
    diffRecords(before, after);
    diffRecords(before, after, ["nested.a[1]"]);
    expect(before).toEqual(beforeCopy);
    expect(after).toEqual(afterCopy);
  });
});

describe("formatDiffValue", () => {
  it("prints missing as empty, dates as ISO, objects and arrays as JSON and the rest as strings", () => {
    expect(formatDiffValue(null)).toBe("");
    expect(formatDiffValue(undefined)).toBe("");
    expect(formatDiffValue(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
    expect(formatDiffValue(new Date(Number.NaN))).toBe("Invalid Date");
    expect(formatDiffValue([1, "a"])).toBe('[1,"a"]');
    expect(formatDiffValue({ a: 1, b: [true] })).toBe('{"a":1,"b":[true]}');
    expect(formatDiffValue("")).toBe("");
    expect(formatDiffValue("text")).toBe("text");
    expect(formatDiffValue(12)).toBe("12");
    expect(formatDiffValue(false)).toBe("false");
  });

  it("falls back to String for a value with a cycle", () => {
    const cyclic: Cyclic = {};
    cyclic.self = cyclic;
    expect(formatDiffValue(cyclic)).toBe("[object Object]");
    const list: object[] = [];
    list.push(list);
    expect(formatDiffValue(list)).toBe(String(list));
  });
});
