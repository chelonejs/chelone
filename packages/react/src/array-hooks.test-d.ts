import type { ArrayRow } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { IteratorItem, UseArrayInputResult } from "./array-hooks";
import { useArrayInput } from "./array-hooks";

type Post = { id: number; tags: { label: string }[] };

describe("array hook result types", () => {
  it("UseArrayInputResult exposes the ra iterator surface, never any", () => {
    expectTypeOf<UseArrayInputResult["source"]>().toBeString();
    expectTypeOf<UseArrayInputResult["total"]>().toBeNumber();
    expectTypeOf<UseArrayInputResult["rows"]>().toEqualTypeOf<
      readonly ArrayRow[]
    >();
    expectTypeOf<UseArrayInputResult["add"]>().toEqualTypeOf<
      (item?: unknown) => void
    >();
    expectTypeOf<UseArrayInputResult["reOrder"]>().toEqualTypeOf<
      (from: number, to: number) => void
    >();
    expectTypeOf<UseArrayInputResult["fieldState"]["invalid"]>().toBeBoolean();
    expectTypeOf<UseArrayInputResult>().not.toBeAny();
  });

  it("IteratorItem is the per-row shape", () => {
    expectTypeOf<IteratorItem["index"]>().toBeNumber();
    expectTypeOf<IteratorItem["total"]>().toBeNumber();
    expectTypeOf<IteratorItem["remove"]>().toEqualTypeOf<() => void>();
    expectTypeOf<IteratorItem["reOrder"]>().toEqualTypeOf<
      (newIndex: number) => void
    >();
    expectTypeOf<IteratorItem>().not.toBeAny();
  });
});

describe("useArrayInput source typing", () => {
  it("useArrayInput<Post> accepts a path of Post", () => {
    expectTypeOf(useArrayInput<Post>).toBeCallableWith({ source: "tags" });
  });

  it("useArrayInput<Post> rejects a source that is not a path of Post", () => {
    // @ts-expect-error "tagz" is not a path of Post
    expectTypeOf(useArrayInput<Post>).toBeCallableWith({ source: "tagz" });
  });

  it("useArrayInput without a type argument takes any string", () => {
    expectTypeOf(useArrayInput).toBeCallableWith({ source: "anything[0].at" });
  });
});
