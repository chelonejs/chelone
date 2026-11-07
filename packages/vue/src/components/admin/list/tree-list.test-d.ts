/**
 * `<TreeList>` is typed by its record: the `select` event and the record every
 * node renders from are the list's record, and with no type argument they keep
 * the loose one.
 */

import type { LooseRecord, RecordTreeNode } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { TreeListEmits } from "./tree-list.vue";
import type { TreeListNodeProps } from "./tree-list-node.vue";

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

interface Post {
  id: number;
  title: string;
}

describe("TreeList record type", () => {
  it("a node callback receives the list's record", () => {
    expectTypeOf<TreeListEmits<Category>["select"]>().toEqualTypeOf<
      [record: Category]
    >();
    expectTypeOf<TreeListNodeProps<Category>["node"]>().toEqualTypeOf<
      RecordTreeNode<Category>
    >();
  });

  it("a node of another record does not compile", () => {
    const node: RecordTreeNode<Post> = {
      record: { id: 1, title: "Alpha" },
      children: [],
    };
    // @ts-expect-error the node holds the list's record, not another one
    const props: TreeListNodeProps<Category> = { node, level: 1 };
    expectTypeOf(props.level).toEqualTypeOf<number>();
  });

  it("a list with no type argument still takes a loose record", () => {
    expectTypeOf<TreeListEmits["select"]>().toEqualTypeOf<
      [record: LooseRecord]
    >();
    expectTypeOf<TreeListNodeProps["node"]>().toEqualTypeOf<
      RecordTreeNode<LooseRecord>
    >();
  });
});
