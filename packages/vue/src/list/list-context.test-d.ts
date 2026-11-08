import type { LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { type ListContextValue, useListContext } from "./list-context";

type Post = { id: number; title: string };

describe("useListContext", () => {
  it("reads the record type the caller asks for", () => {
    expectTypeOf(useListContext<Post>().data).toEqualTypeOf<
      Post[] | undefined
    >();
    expectTypeOf(useListContext<Post>()).toEqualTypeOf<
      ListContextValue<Post>
    >();
  });

  it("reads a LooseRecord with no type argument", () => {
    expectTypeOf(useListContext().data).toEqualTypeOf<
      LooseRecord[] | undefined
    >();
    expectTypeOf(useListContext()).toEqualTypeOf<
      ListContextValue<LooseRecord>
    >();
  });

  it("takes a record type that is not a ResourceRecord", () => {
    expectTypeOf(useListContext<string>().data).toEqualTypeOf<
      string[] | undefined
    >();
  });
});
