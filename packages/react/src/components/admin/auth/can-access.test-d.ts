/**
 * `<CanAccess>` takes a record, not any value: `id` is the floor, and the rest
 * of the record is whatever the grant's predicate reads, so both a record the
 * caller typed and an inline record with its fields fit. `.test-d.ts` files
 * cannot use JSX, so the call is made directly.
 */

import type { ResourceRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { CanAccess, type CanAccessProps } from "./can-access";

interface Post extends ResourceRecord {
  id: number;
  author: string;
}

const ownPost: Post = { id: 1, author: "rin" };

describe("<CanAccess> record prop", () => {
  it("floors at a record: id is required", () => {
    expectTypeOf<CanAccessProps["record"]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
  });

  it("takes a record the app typed itself", () => {
    const gate = CanAccess({
      action: "edit",
      resource: "posts",
      record: ownPost,
      children: null,
    });
    expectTypeOf(gate).not.toBeAny();
  });

  it("takes an inline record, fields and all", () => {
    const gate = CanAccess({
      action: "edit",
      resource: "posts",
      record: { id: 7, author: "rin" },
      children: null,
    });
    expectTypeOf(gate).not.toBeAny();
  });

  it("rejects a value with no id", () => {
    const gate = CanAccess({
      action: "edit",
      resource: "posts",
      // @ts-expect-error a record with no `id` is not a record
      record: { author: "rin" },
      children: null,
    });
    expectTypeOf(gate).not.toBeAny();
  });
});
