/**
 * The list components take the record they are generic over: a slot, an item
 * and a row each receive that record, not a string-keyed bag. A generic
 * component is a function whose first parameter is its props and whose second
 * is its context.
 */

import type { Identifier } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type SimpleList from "./simple-list.vue";
import type SimpleListItem from "./simple-list-item.vue";
import type SingleFieldList from "./single-field-list.vue";
import type SingleFieldListRecord from "./single-field-list-record.vue";

type Post = { id: number; title: string };

describe("list record props", () => {
  it("SimpleList's slot receives the list's record", () => {
    type Context = NonNullable<Parameters<typeof SimpleList<Post>>[1]>;
    type Slot = NonNullable<Context["slots"]["primary-text"]>;
    expectTypeOf<Parameters<Slot>[0]["record"]>().toEqualTypeOf<Post>();
    expectTypeOf<Parameters<Slot>[0]["id"]>().toEqualTypeOf<Identifier>();
  });

  it("SingleFieldList's item slot receives the list's record", () => {
    type Context = NonNullable<Parameters<typeof SingleFieldList<Post>>[1]>;
    type Slot = NonNullable<Context["slots"]["item"]>;
    expectTypeOf<Parameters<Slot>[0]["record"]>().toEqualTypeOf<Post>();
  });

  it("SimpleListItem and SingleFieldListRecord take the record they are generic over", () => {
    expectTypeOf<
      Parameters<typeof SimpleListItem<Post>>[0]["record"]
    >().toEqualTypeOf<Post | undefined>();
    expectTypeOf<
      Parameters<typeof SingleFieldListRecord<Post>>[0]["record"]
    >().toEqualTypeOf<Post>();
  });
});
