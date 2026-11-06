import type { ArrayRow } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { fakeArrayRow } from "./array-row";

describe("fakeArrayRow", () => {
  it("returns a whole ArrayRow, so a test passes it with no cast", () => {
    expectTypeOf(fakeArrayRow()).toEqualTypeOf<ArrayRow>();
    expectTypeOf(fakeArrayRow({ id: "r", index: 0 })).toEqualTypeOf<ArrayRow>();
  });

  it("rejects an override that is not the row's own shape", () => {
    // @ts-expect-error index is a number, not a string
    fakeArrayRow({ index: "0" });
    // @ts-expect-error remove resolves void, not a string
    fakeArrayRow({ remove: async () => "gone" });
    // @ts-expect-error reOrder is a function, not a number
    fakeArrayRow({ reOrder: 7 });
    // @ts-expect-error not a member of ArrayRow
    fakeArrayRow({ move: () => {} });
  });
});
