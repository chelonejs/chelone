/**
 * `<CanAccess>` takes a record, not any value: the record it is given must be a
 * record, so a record-level grant can read its fields. The Vue twin of
 * `@chelone/react`'s `auth/can-access.test-d.ts`.
 */

import type { ResourceRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { CanAccessProps } from "./can-access.vue";

describe("CanAccessProps", () => {
  it("record is a ResourceRecord", () => {
    expectTypeOf<CanAccessProps["record"]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
  });

  it("rejects a record with no id", () => {
    const props: CanAccessProps = {
      action: "edit",
      resource: "posts",
      // @ts-expect-error a record with no `id` is not a record
      record: { author: "rin" },
    };
    expectTypeOf(props).toEqualTypeOf<CanAccessProps>();
  });

  it("accepts a record with an id", () => {
    const props: CanAccessProps = {
      action: "edit",
      resource: "posts",
      record: { id: 7 },
    };
    expectTypeOf(props.record).toEqualTypeOf<ResourceRecord | undefined>();
  });
});
