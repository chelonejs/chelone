/**
 * `<CanAccess>` takes a record, not any value: the record it is given must be a
 * record, so a record-level grant can read its fields. `.test-d.ts` files cannot
 * use JSX, so the props a call site passes are checked as a `CanAccessProps`.
 */

import type { ResourceRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { CanAccessProps } from "./can-access";

describe("CanAccessProps", () => {
  it("record is a ResourceRecord", () => {
    expectTypeOf<CanAccessProps["record"]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
  });

  it("rejects a record with no id", () => {
    const missing: CanAccessProps = {
      action: "edit",
      resource: "posts",
      // @ts-expect-error a record with no `id` is not a record
      record: { author: "rin" },
    };
    expectTypeOf(missing).toEqualTypeOf<CanAccessProps>();
  });

  it("accepts a record with an id", () => {
    const props: CanAccessProps = {
      action: "edit",
      resource: "posts",
      record: { id: 7 },
      children: null,
    };
    expectTypeOf(props.record).toEqualTypeOf<ResourceRecord | undefined>();
  });
});
