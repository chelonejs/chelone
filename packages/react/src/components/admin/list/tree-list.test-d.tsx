/**
 * `<TreeList>` is typed by its record: `onSelect` and every callback a node
 * reads from the tree get the list's record, and with no type argument they
 * keep the loose one.
 */

import type { LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { TreeList, type TreeListProps } from "./tree-list";

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
    <TreeList<Category>
      parentSource="parent_id"
      titleSource="name"
      onSelect={(record) => {
        expectTypeOf(record).toEqualTypeOf<Category>();
        record.name satisfies string;
        record.parent_id satisfies number | null;
      }}
    />;
  });

  it("onSelect of a typed list is typed by that record", () => {
    expectTypeOf<TreeListProps<Category>["onSelect"]>().toEqualTypeOf<
      ((record: Category) => void) | undefined
    >();
  });

  it("a callback for another record is not an onSelect for this list", () => {
    const onSelect = (record: Post) => record.title;
    expectTypeOf(onSelect).not.toMatchTypeOf<
      TreeListProps<Category>["onSelect"]
    >();
  });

  it("a list with no type argument still takes a loose record", () => {
    expectTypeOf<TreeListProps["onSelect"]>().toEqualTypeOf<
      ((record: LooseRecord) => void) | undefined
    >();
  });
});
