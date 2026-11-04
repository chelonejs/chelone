/**
 * The board's group source is the field a drop writes, and the two title
 * sources are the fields a card shows: all three read the record the ambient
 * `<List>` holds. Vue checks them through one `BoardSources` pick and
 * `assertType`, as the workflow buttons do.
 */

import type { LooseRecord, SourceKey, SourceProp } from "@chelone/core";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type { KanbanBoardProps } from "./kanban-board.vue";

// A type alias: an interface has no index signature, so it does not satisfy
// the board's `LooseRecord` constraint.
type Task = { id: number; title: string; status: string };

/** The three source props, all required, so each check names all three. */
type BoardSources<T extends LooseRecord> = Pick<
  Required<KanbanBoardProps<T>>,
  "groupSource" | "titleSource" | "descriptionSource"
>;

describe("KanbanBoard source props", () => {
  it("groupSource is a SourceKey and the title sources are SourceProp", () => {
    assertType<BoardSources<LooseRecord>>({
      groupSource: "status",
      titleSource: "title",
      descriptionSource: "title",
    });
    expectTypeOf<BoardSources<LooseRecord>>().toEqualTypeOf<{
      groupSource: string;
      titleSource: SourceProp;
      descriptionSource: SourceProp;
    }>();
  });

  it("they follow an explicit record type", () => {
    assertType<BoardSources<Task>>({
      groupSource: "status",
      titleSource: "title",
      descriptionSource: "status",
    });
    expectTypeOf<BoardSources<Task>["groupSource"]>().toEqualTypeOf<
      SourceKey<Task>
    >();
    expectTypeOf<BoardSources<Task>["titleSource"]>().toEqualTypeOf<
      SourceProp<Task>
    >();
  });

  it("a key that is not on the record is rejected", () => {
    assertType<BoardSources<Task>>({
      // @ts-expect-error `state` is not a key of Task
      groupSource: "state",
      titleSource: "title",
      descriptionSource: "status",
    });
    assertType<BoardSources<Task>>({
      groupSource: "status",
      // @ts-expect-error `name` is not a path of Task
      titleSource: "name",
      descriptionSource: "status",
    });
    assertType<BoardSources<Task>>({
      groupSource: "status",
      titleSource: "title",
      // @ts-expect-error `summary` is not a path of Task
      descriptionSource: "summary",
    });
  });
});
