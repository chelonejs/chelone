import type { LooseRecord, SourceValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { readFieldValue } from "./read-field-value";

interface Post {
  id: number;
  title: string;
  author: { name: string; bio?: { short: string } };
  tags: { label: string }[];
}

const post: Post = {
  id: 1,
  title: "Hello",
  author: { name: "Ada" },
  tags: [{ label: "news" }],
};

describe("readFieldValue types", () => {
  it("rejects a misspelled source on a typed record", () => {
    // @ts-expect-error "titel" is not a path of Post
    readFieldValue(post, "titel");
    // @ts-expect-error "author.nme" is not a path of Post
    readFieldValue(post, "author.nme");
  });

  it("returns the SourceValue at the source path", () => {
    expectTypeOf(readFieldValue(post, "title")).toEqualTypeOf<
      SourceValue<Post, "title">
    >();
    expectTypeOf(readFieldValue(post, "author.name")).toEqualTypeOf<string>();
    expectTypeOf(readFieldValue(post, "author.bio.short")).toEqualTypeOf<
      SourceValue<Post, "author.bio.short">
    >();
    expectTypeOf(readFieldValue(post, "tags[0].label")).toEqualTypeOf<
      SourceValue<Post, "tags[0].label">
    >();
  });

  it("takes a defaultValue of the type at the source path", () => {
    expectTypeOf(readFieldValue(post, "title", "Untitled")).toEqualTypeOf<
      SourceValue<Post, "title">
    >();
    // @ts-expect-error a number is not the string at "title"
    readFieldValue(post, "title", 0);
    // @ts-expect-error a string is not the number at "id"
    readFieldValue(post, "id", "none");
  });

  it("reads any path of a loose record as unknown", () => {
    const loose: LooseRecord = { id: 1, title: "x" };
    expectTypeOf(readFieldValue(loose, "anything.at.all")).toBeUnknown();
  });
});
