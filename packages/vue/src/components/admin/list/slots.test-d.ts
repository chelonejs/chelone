/**
 * A slot function returns what the renderer accepts: `VNode[]`, the return
 * type of Vue's own `Slot`.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { VNode } from "vue";
import type KanbanBoard from "../../kanban/kanban-board.vue";
import type SimpleList from "./simple-list.vue";

type Task = { id: number; title: string };

describe("list slots", () => {
  it("the SimpleList empty slot returns VNode[]", () => {
    type Context = NonNullable<Parameters<typeof SimpleList<Task>>[1]>;
    expectTypeOf<
      ReturnType<NonNullable<Context["slots"]["empty"]>>
    >().toEqualTypeOf<VNode[]>();
  });

  it("the KanbanBoard card slot returns VNode[]", () => {
    type Context = NonNullable<Parameters<typeof KanbanBoard<Task>>[1]>;
    expectTypeOf<
      ReturnType<NonNullable<Context["slots"]["card"]>>
    >().toEqualTypeOf<VNode[]>();
  });
});
