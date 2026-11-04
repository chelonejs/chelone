import type { SourceKey, SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { KanbanBoardProps } from "./kanban-board";

// A type alias: an interface has no index signature, so it does not satisfy
// the board's `LooseRecord` constraint.
type Task = {
  id: number;
  title: string;
  status: string;
};

describe("KanbanBoard source props", () => {
  it("groupSource is a SourceKey and the title sources are SourceProp", () => {
    expectTypeOf<KanbanBoardProps["groupSource"]>().toEqualTypeOf<string>();
    expectTypeOf<KanbanBoardProps["titleSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<KanbanBoardProps["descriptionSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("they follow an explicit record type", () => {
    expectTypeOf<KanbanBoardProps<Task>["groupSource"]>().toEqualTypeOf<
      SourceKey<Task>
    >();
    expectTypeOf<KanbanBoardProps<Task>["groupSource"]>().toEqualTypeOf<
      "id" | "title" | "status"
    >();
    expectTypeOf<KanbanBoardProps<Task>["titleSource"]>().toEqualTypeOf<
      SourceProp<Task> | undefined
    >();
    expectTypeOf<KanbanBoardProps<Task>["descriptionSource"]>().toEqualTypeOf<
      SourceProp<Task> | undefined
    >();
  });

  it("a key that is not on the record is rejected", () => {
    const group: KanbanBoardProps<Task> = {
      // @ts-expect-error `state` is not a key of Task
      groupSource: "state",
      columns: [],
    };
    const title: KanbanBoardProps<Task> = {
      groupSource: "status",
      columns: [],
      // @ts-expect-error `name` is not a path of Task
      titleSource: "name",
    };
    const description: KanbanBoardProps<Task> = {
      groupSource: "status",
      columns: [],
      // @ts-expect-error `summary` is not a path of Task
      descriptionSource: "summary",
    };
    expectTypeOf(group).not.toBeAny();
    expectTypeOf(title).not.toBeAny();
    expectTypeOf(description).not.toBeAny();
  });
});
