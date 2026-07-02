import { expectTypeOf, it } from "vitest";
import type { LooseRecord, ResourceRecord } from "./record";

it("ResourceRecord requires an id of Identifier type", () => {
  expectTypeOf<ResourceRecord>().toMatchTypeOf<{ id: string | number }>();
  expectTypeOf<ResourceRecord<string>["id"]>().toEqualTypeOf<string>();
});

it("LooseRecord exposes unknown (never any) for extra fields", () => {
  expectTypeOf<LooseRecord["id"]>().toEqualTypeOf<string | number>();
  expectTypeOf<LooseRecord["anythingElse"]>().toEqualTypeOf<unknown>();
});
