/**
 * `<InPlaceEditor>` names a path into the record, so with an explicit `record`
 * type a path of it compiles and a typo does not.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { InPlaceEditorProps } from "./in-place-editor";

// A type alias: an interface has no index signature, so it does not satisfy
// the record constraint.
type Post = {
  id: number;
  title: string;
  settings: { theme: string };
};

describe("<InPlaceEditor> source", () => {
  it("source is SourceProp", () => {
    expectTypeOf<InPlaceEditorProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<InPlaceEditorProps<Post>["source"]>().toEqualTypeOf<
      SourceProp<Post> | undefined
    >();
  });

  it("it follows an explicit record type", () => {
    const title: InPlaceEditorProps<Post> = { source: "title" };
    const nested: InPlaceEditorProps<Post> = { source: "settings.theme" };
    const onSuccess: InPlaceEditorProps<Post> = {
      source: "title",
      onSuccess: (record) => {
        expectTypeOf(record).toEqualTypeOf<Post>();
      },
    };

    expectTypeOf(title).toMatchTypeOf<InPlaceEditorProps<Post>>();
    expectTypeOf(nested).toMatchTypeOf<InPlaceEditorProps<Post>>();
    expectTypeOf(onSuccess).toMatchTypeOf<InPlaceEditorProps<Post>>();
  });

  it("a path that is not on the record is rejected", () => {
    const typo: InPlaceEditorProps<Post> = {
      // @ts-expect-error `titel` is not a path of Post
      source: "titel",
    };

    expectTypeOf(typo).toMatchTypeOf<InPlaceEditorProps<Post>>();
  });
});
