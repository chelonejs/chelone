/**
 * `<DiffViewer>` takes two records of one type, and `sources` are the paths
 * of that record, so a misspelled field fails to compile.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { DiffViewerMode, DiffViewerProps } from "./diff-viewer";

type Post = {
  id: number;
  title: string;
  author: { name: string };
};

declare const post: Post;

describe("DiffViewer props", () => {
  it("sources are SourceProp of the record", () => {
    expectTypeOf<DiffViewerProps<Post>["sources"]>().toEqualTypeOf<
      readonly SourceProp<Post>[] | undefined
    >();
    const props: DiffViewerProps<Post> = {
      before: post,
      after: post,
      sources: ["title", "author.name"],
    };
    expectTypeOf(props.sources).not.toBeAny();
  });

  it("before and after follow an explicit record type", () => {
    expectTypeOf<DiffViewerProps<Post>["before"]>().toEqualTypeOf<Post>();
    expectTypeOf<DiffViewerProps<Post>["after"]>().toEqualTypeOf<Post>();
    expectTypeOf<DiffViewerProps["mode"]>().toEqualTypeOf<
      DiffViewerMode | undefined
    >();
    expectTypeOf<DiffViewerMode>().toEqualTypeOf<"side-by-side" | "inline">();
  });

  it("a path that is not on the record is rejected", () => {
    const props: DiffViewerProps<Post> = {
      before: post,
      after: post,
      // @ts-expect-error "titel" is not a path of Post
      sources: ["titel"],
    };
    expectTypeOf(props).toExtend<DiffViewerProps<Post>>();
  });
});
