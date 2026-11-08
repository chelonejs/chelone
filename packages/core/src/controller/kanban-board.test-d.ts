import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import type { SourceKey } from "../resource/source-path";
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

  it("move data accepts only the record's top-level keys", () => {
    expectTypeOf<keyof KanbanMove<Task>["data"]>().toEqualTypeOf<
      SourceKey<Task>
    >();
    const move: KanbanMove<Task> = {
      id: task.id,
      data: { status: "done" },
      previousData: task,
    };
    expectTypeOf(move.data).toEqualTypeOf<{
      id?: string;
      status?: string;
      title?: string;
    }>();
    // @ts-expect-error "state" is not a key of Task
    move.data = { state: "x" };
  });

  it("a loose record takes any string", () => {
    expectTypeOf(buildKanbanBuckets(loose, "stage", columns)).toEqualTypeOf<
      KanbanBucket<LooseRecord>[]
    >();
    expectTypeOf(
      planKanbanMove(looseRecord, "whatever", columns, "done"),
    ).toEqualTypeOf<KanbanMove<LooseRecord> | null>();
    const data: KanbanMove<LooseRecord>["data"] = { anyKey: "done" };
    expectTypeOf(data).toEqualTypeOf<KanbanMove["data"]>();
  });
});
