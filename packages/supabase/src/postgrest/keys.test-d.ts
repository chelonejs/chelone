import type { Identifier, LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { withVirtualId } from "./keys";

const row: LooseRecord = { id: 1, a: "x", b: "y" };

describe("withVirtualId", () => {
  it("types the id of a record keyed by id as an Identifier", () => {
    expectTypeOf(withVirtualId(row, ["id"]).id).toEqualTypeOf<Identifier>();
  });

  it("types the id of a record with a compound key as an Identifier", () => {
    expectTypeOf(withVirtualId(row, ["a", "b"]).id).toEqualTypeOf<Identifier>();
  });
});
