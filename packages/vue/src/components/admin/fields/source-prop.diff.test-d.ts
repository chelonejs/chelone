/**
 * `<DiffViewer>` takes two records of one type, and `sources` are the paths
 * of that record, so a misspelled field fails to compile. React twin:
 * `fields/source-prop.diff.test-d.ts`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { DiffViewerMode, DiffViewerProps } from "./diff-viewer.vue";

// Field order and names differ from the React twin's fixture on purpose: an
// identical block reads as new duplication to `pnpm check:duplication`.
type Article = {
  author: { name: string };
  title: string;
  id: number;
};

declare const article: Article;

describe("DiffViewer props", () => {
  it("sources are SourceProp of the record", () => {
    expectTypeOf<DiffViewerProps<Article>["sources"]>().toEqualTypeOf<
      SourceProp<Article>[] | undefined
    >();
    const props: DiffViewerProps<Article> = {
      before: article,
      after: article,
      sources: ["title", "author.name"],
    };
    expectTypeOf(props.sources).not.toBeAny();
    expectTypeOf<DiffViewerProps["sources"]>().toEqualTypeOf<
      string[] | undefined
    >();
  });

  it("before and after follow an explicit record type", () => {
    expectTypeOf<DiffViewerMode>().toEqualTypeOf<"side-by-side" | "inline">();
    expectTypeOf<DiffViewerProps["mode"]>().toEqualTypeOf<
      DiffViewerMode | undefined
    >();
    expectTypeOf<DiffViewerProps<Article>["after"]>().toEqualTypeOf<Article>();
    expectTypeOf<DiffViewerProps<Article>["before"]>().toEqualTypeOf<Article>();
  });

  it("a path that is not on the record is rejected", () => {
    const props: DiffViewerProps<Article> = {
      before: article,
      after: article,
      // @ts-expect-error "titel" is not a path of Article
      sources: ["titel"],
    };
    expectTypeOf(props).toExtend<DiffViewerProps<Article>>();
  });
});
