import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import {
  buildKanbanBuckets,
  type KanbanBucket,
  type KanbanColumnDef,
  type KanbanMove,
  planKanbanMove,
} from "./kanban-board";

interface Task {
  id: number;
  status: string;
  title: string;
}

const columns: KanbanColumnDef[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
];
const tasks: Task[] = [{ id: 1, status: "todo", title: "write it" }];
const task: Task = { id: 2, status: "doing", title: "ship it" };
const loose: LooseRecord[] = [{ id: 3, stage: "todo" }];
const looseRecord: LooseRecord = { id: 4, stage: "doing" };

describe("kanban-board source keys", () => {
  it("buildKanbanBuckets and planKanbanMove accept a top-level key of the record", () => {
    expectTypeOf(buildKanbanBuckets(tasks, "status", columns)).toEqualTypeOf<
      KanbanBucket<Task>[]
    >();
    expectTypeOf(buildKanbanBuckets(tasks, "title", columns)).toEqualTypeOf<
      KanbanBucket<Task>[]
    >();
    expectTypeOf(
      planKanbanMove(task, "status", columns, "done"),
    ).toEqualTypeOf<KanbanMove<Task> | null>();
  });

  it("they reject a key that is not on the record", () => {
    // @ts-expect-error "state" is not a key of Task
    buildKanbanBuckets(tasks, "state", columns);
    // @ts-expect-error "state" is not a key of Task
    planKanbanMove(task, "state", columns, "done");
  });

  it("a loose record takes any string", () => {
    expectTypeOf(buildKanbanBuckets(loose, "stage", columns)).toEqualTypeOf<
      KanbanBucket<LooseRecord>[]
    >();
    expectTypeOf(
      planKanbanMove(looseRecord, "whatever", columns, "done"),
    ).toEqualTypeOf<KanbanMove<LooseRecord> | null>();
  });
});
