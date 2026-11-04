import { describe, expect, it } from "vitest";
import {
  buildKanbanBuckets,
  type KanbanColumnDef,
  type KanbanMove,
  planKanbanMove,
} from "./kanban-board";

type Task = { id: number | string; status?: string | null; title: string };

const columns: KanbanColumnDef[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress", className: "bg-accent" },
  { id: "done", label: "Done" },
];

/** Column ids with the ids of the records each one holds. */
const idsByColumn = (
  records: Task[],
  groupSource: "status",
  cols: KanbanColumnDef[],
) =>
  buildKanbanBuckets(records, groupSource, cols).map((bucket) => ({
    id: bucket.column.id,
    records: bucket.records.map((record) => record.id),
  }));

describe("buildKanbanBuckets", () => {
  it("returns a bucket per column in column order, empty ones included", () => {
    const buckets = buildKanbanBuckets(
      [{ id: 1, status: "done", title: "shipped" }],
      "status",
      columns,
    );
    expect(buckets.map((bucket) => bucket.column)).toEqual(columns);
    expect(buckets.map((bucket) => bucket.records.length)).toEqual([0, 0, 1]);
  });

  it("puts each record in the column its group value names, in list order", () => {
    const records: Task[] = [
      { id: 3, status: "doing", title: "third" },
      { id: 1, status: "todo", title: "first" },
      { id: 4, status: "doing", title: "fourth" },
      { id: 2, status: "todo", title: "second" },
    ];
    expect(idsByColumn(records, "status", columns)).toEqual([
      { id: "todo", records: [1, 2] },
      { id: "doing", records: [3, 4] },
      { id: "done", records: [] },
    ]);
  });

  it("leaves out a record whose group value matches no column", () => {
    const records: Task[] = [
      { id: 1, status: "archived", title: "off the board" },
      { id: 2, status: "todo", title: "on the board" },
    ];
    const buckets = buildKanbanBuckets(records, "status", columns);
    expect(buckets.map((bucket) => bucket.records.length)).toEqual([1, 0, 0]);
    expect(
      buckets.reduce((total, bucket) => total + bucket.records.length, 0),
    ).toBe(1);
  });

  it("reads a missing or null group value as the empty string", () => {
    const withEmpty: KanbanColumnDef[] = [
      { id: "", label: "Unset" },
      ...columns,
    ];
    const records: Task[] = [
      { id: 1, title: "no status at all" },
      { id: 2, status: null, title: "null status" },
      { id: 3, status: undefined, title: "undefined status" },
    ];
    expect(idsByColumn(records, "status", withEmpty)).toEqual([
      { id: "", records: [1, 2, 3] },
      { id: "todo", records: [] },
      { id: "doing", records: [] },
      { id: "done", records: [] },
    ]);
  });

  it("keeps the first column's records when a column id repeats", () => {
    const doubled: KanbanColumnDef[] = [
      { id: "todo", label: "To do" },
      { id: "doing", label: "In progress" },
      { id: "todo", label: "To do (duplicate)" },
    ];
    const records: Task[] = [
      { id: 1, status: "todo", title: "first" },
      { id: 2, status: "doing", title: "second" },
    ];
    expect(idsByColumn(records, "status", doubled)).toEqual([
      { id: "todo", records: [1] },
      { id: "doing", records: [2] },
      { id: "todo", records: [] },
    ]);
  });

  it("does not mutate the records or the columns", () => {
    const records: Task[] = [
      { id: 1, status: "todo", title: "first" },
      { id: 2, status: "doing", title: "second" },
    ];
    const before = structuredClone(records);
    const columnsBefore = structuredClone(columns);
    const recordCopy = [...records];
    const columnCopy = [...columns];
    const buckets = buildKanbanBuckets(records, "status", columns);
    expect(records).toEqual(before);
    expect(columns).toEqual(columnsBefore);
    // the buckets hold the caller's own objects, not copies of them
    expect(buckets[0]?.column).toBe(columnCopy[0]);
    expect(buckets[1]?.column).toBe(columnCopy[1]);
    expect(buckets[0]?.records[0]).toBe(recordCopy[0]);
    expect(buckets[1]?.records[0]).toBe(recordCopy[1]);
    expect(buckets[0]?.records).not.toBe(records);
  });
});

describe("planKanbanMove", () => {
  it("writes the target column id to the group source and keeps the record as previousData", () => {
    const record: Task = { id: 7, status: "todo", title: "carry it" };
    const expected: KanbanMove<Task> = {
      id: 7,
      data: { status: "doing" },
      previousData: record,
    };
    const move = planKanbanMove(record, "status", columns, "doing");
    expect(move).toEqual(expected);
    expect(move?.previousData).toBe(record);
    expect(record.status).toBe("todo");
  });

  it("returns null for the column the record is already in", () => {
    expect(
      planKanbanMove(
        { id: 1, status: "todo", title: "stays" },
        "status",
        columns,
        "todo",
      ),
    ).toBeNull();
    expect(
      planKanbanMove(
        { id: 2, status: null, title: "unset" },
        "status",
        [{ id: "", label: "Unset" }],
        "",
      ),
    ).toBeNull();
  });

  it("returns null for a target that is not a column", () => {
    expect(
      planKanbanMove(
        { id: 1, status: "todo", title: "stays" },
        "status",
        columns,
        "archived",
      ),
    ).toBeNull();
    expect(
      planKanbanMove(
        { id: 1, status: "todo", title: "stays" },
        "status",
        [],
        "todo",
      ),
    ).toBeNull();
  });
});
