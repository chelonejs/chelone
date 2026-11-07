/**
 * `<InPlaceEditor>` is a generic component: its `source` follows the record
 * type the app names, and stays a plain `SourceProp` when none is named.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { InPlaceEditorProps } from "./in-place-editor.vue";

interface Article {
  id: string;
  headline: string;
  author: { name: string; email: string };
}

type ArticleProps = InPlaceEditorProps<Article>;

describe("<InPlaceEditor> source", () => {
  it("source is SourceProp", () => {
    expectTypeOf<InPlaceEditorProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<ArticleProps["source"]>().toEqualTypeOf<
      SourceProp<Article> | undefined
    >();
  });

  it("it follows an explicit record type", () => {
    expectTypeOf({ source: "headline" } as const).toExtend<ArticleProps>();
    expectTypeOf({ source: "author.email" } as const).toExtend<ArticleProps>();
  });

  it("a path that is not on the record is rejected", () => {
    expectTypeOf({ source: "headlin" } as const).not.toExtend<ArticleProps>();

    const typo: ArticleProps = {
      // @ts-expect-error `headlin` is not a path of Article
      source: "headlin",
    };
    expectTypeOf(typo).toExtend<ArticleProps>();
  });
});
