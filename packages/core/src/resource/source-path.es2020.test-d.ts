import { describe, expectTypeOf, it } from "vitest";
import type { SourceProp, SourceValue } from "./source-path";

// Typechecked by tsconfig.es2020.json (lib ES2020, skipLibCheck): dot.paths
// 0.2.0 degraded Paths and Get to `any` there, so a misspelled source compiled.
type Post = { title: string; author: { name: string } };

describe("SourceProp under lib ES2020", () => {
  it("accepts a real path", () => {
    expectTypeOf<"title">().toExtend<SourceProp<Post>>();
    expectTypeOf<"author.name">().toExtend<SourceProp<Post>>();
  });

  it("rejects a misspelled path and a number", () => {
    // @ts-expect-error "titel" is not a path of Post
    expectTypeOf<"titel">().toExtend<SourceProp<Post>>();
    // @ts-expect-error a source is a string path
    expectTypeOf<number>().toExtend<SourceProp<Post>>();
  });
});

describe("SourceValue under lib ES2020", () => {
  it("resolves a nested path to its type", () => {
    expectTypeOf<SourceValue<Post, "author.name">>().toEqualTypeOf<string>();
  });
});
