/**
 * `<CanAccess>` takes a record, not any value: `id` is the floor, and the rest
 * of the record is whatever the grant's predicate reads, so both a record the
 * caller typed and an inline record with its fields fit. The Vue twin of
 * `@chelone/react`'s `auth/can-access.test-d.ts`.
 */

import type { LooseRecord, ResourceRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";

import type CanAccess from "./can-access.vue";
import type { CanAccessProps } from "./can-access.vue";

interface Draft extends ResourceRecord {
  id: number;
  author: string;
}

/** The props a mount actually receives, read off the SFC itself. */
type MountedProps = InstanceType<typeof CanAccess>["$props"];

describe("<CanAccess> record prop", () => {
  it("floors at a record: id is required", () => {
    expectTypeOf<CanAccessProps["record"]>().toEqualTypeOf<
      ResourceRecord | LooseRecord | undefined
    >();
  });

  it("the props a mount receives agree with the exported ones", () => {
    expectTypeOf<MountedProps["record"]>().toEqualTypeOf<
      CanAccessProps["record"]
    >();
  });

  it("takes a record the app typed itself", () => {
    const draft: Draft = { id: 1, author: "rin" };
    const gate: CanAccessProps = {
      action: "edit",
      resource: "posts",
      record: draft,
    };
    expectTypeOf(gate.record).toEqualTypeOf<
      ResourceRecord | LooseRecord | undefined
    >();
  });

  it("takes an inline record, fields and all", () => {
    const gate: CanAccessProps = {
      action: "edit",
      resource: "posts",
      record: { id: 7, author: "rin" },
    };
    expectTypeOf(gate.record).toEqualTypeOf<
      ResourceRecord | LooseRecord | undefined
    >();
  });

  it("rejects a value with no id", () => {
    const gate: CanAccessProps = {
      action: "edit",
      resource: "posts",
      // @ts-expect-error a record with no `id` is not a record
      record: { author: "rin" },
    };
    expectTypeOf(gate).toEqualTypeOf<CanAccessProps>();
  });
});
