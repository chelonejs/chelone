/**
 * `reference` and `target` on the six reference components, typed against a
 * resource map. Like `createResourceComponentsOf`, the map is a type argument,
 * so these tests need no `Register` augmentation, which is global to a
 * TypeScript program. TypeScript takes all type arguments or none, so each call
 * names the record, the map and the reference.
 */

import {
  defineResources,
  type LooseRecord,
  type RecordOf,
  type ReferenceTargetOf,
  type RegisteredResourceName,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  ReferenceArrayInput,
  type ReferenceArrayInputProps,
} from "../inputs/reference-array-input";
import {
  ReferenceInput,
  type ReferenceInputProps,
} from "../inputs/reference-input";
import {
  ReferenceArrayField,
  type ReferenceArrayFieldProps,
} from "./reference-array-field";
import { ReferenceField, type ReferenceFieldProps } from "./reference-field";
import {
  ReferenceManyField,
  type ReferenceManyFieldProps,
} from "./reference-many-field";
import {
  ReferenceOneField,
  type ReferenceOneFieldProps,
} from "./reference-one-field";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      author_id: z.number(),
      tag_ids: z.array(z.number()),
    }),
  },
  authors: { schema: z.object({ id: z.number(), name: z.string() }) },
  comments: {
    schema: z.object({ id: z.number(), post_id: z.number(), body: z.string() }),
  },
});

type Post = RecordOf<typeof resources, "posts">;
type Comment = RecordOf<typeof resources, "comments">;

const post: Post = {
  id: 1,
  title: "one",
  author_id: 7,
  tag_ids: [1, 2],
};

/**
 * What an app with `Register` augmented sees: the map is fixed by the app and
 * only the name is inferred, so `target` follows the name with no type argument
 * written at the call.
 */
declare function postsField<TReference extends keyof typeof resources & string>(
  props: ReferenceManyFieldProps<LooseRecord, typeof resources, TReference>,
): void;

describe("with nothing registered", () => {
  it("reference and target fall back to string", () => {
    expectTypeOf<
      ReferenceFieldProps["reference"]
    >().toEqualTypeOf<RegisteredResourceName>();
    expectTypeOf<ReferenceFieldProps["reference"]>().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceManyFieldProps["reference"]
    >().toEqualTypeOf<string>();
    expectTypeOf<ReferenceManyFieldProps["target"]>().toEqualTypeOf<string>();
    expectTypeOf<ReferenceOneFieldProps["target"]>().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceArrayFieldProps["reference"]
    >().toEqualTypeOf<string>();
    expectTypeOf<ReferenceInputProps["reference"]>().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceArrayInputProps["reference"]
    >().toEqualTypeOf<string>();
  });

  it("source stays a SourceProp of the record", () => {
    expectTypeOf<ReferenceFieldProps["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<ReferenceManyFieldProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<ReferenceInputProps["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("any name and any target compile", () => {
    ReferenceField({ source: "author_id", reference: "whatever" });
    ReferenceManyField({
      reference: "whatever",
      target: "any_column",
      source: "author.roles[0].name",
    });
    ReferenceOneField({ reference: "whatever", target: "any_column" });
    ReferenceArrayField({ source: "tag_ids", reference: "whatever" });
    ReferenceInput({ source: "company_id", reference: "whatever" });
    ReferenceArrayInput({ source: "tag_ids", reference: "whatever" });
  });
});

describe("with a resource map", () => {
  it("reference is a name of the map", () => {
    expectTypeOf<
      ReferenceFieldProps<LooseRecord, typeof resources>["reference"]
    >().toEqualTypeOf<"posts" | "authors" | "comments">();
    expectTypeOf<
      ReferenceManyFieldProps<LooseRecord, typeof resources>["reference"]
    >().toEqualTypeOf<"posts" | "authors" | "comments">();
    expectTypeOf<
      ReferenceArrayInputProps<LooseRecord, typeof resources>["reference"]
    >().toEqualTypeOf<"posts" | "authors" | "comments">();
  });

  it("target is a key of the referenced resource's record", () => {
    expectTypeOf<
      ReferenceManyFieldProps<
        LooseRecord,
        typeof resources,
        "comments"
      >["target"]
    >().toEqualTypeOf<SourceKey<Comment>>();
    expectTypeOf<
      ReferenceOneFieldProps<
        LooseRecord,
        typeof resources,
        "comments"
      >["target"]
    >().toEqualTypeOf<"id" | "post_id" | "body">();
    expectTypeOf<
      ReferenceManyFieldProps<LooseRecord, typeof resources, "posts">["target"]
    >().toEqualTypeOf<ReferenceTargetOf<typeof resources, "posts">>();
  });

  it("a reference the map does not have is a type error", () => {
    ReferenceField<LooseRecord, typeof resources, "authors">({
      source: "author_id",
      reference: "authors",
    });
    ReferenceField<LooseRecord, typeof resources, "authors">({
      source: "author_id",
      // @ts-expect-error "tags" is no resource of the map
      reference: "tags",
    });
    ReferenceArrayInput<LooseRecord, typeof resources, "comments">({
      source: "tag_ids",
      reference: "comments",
    });
    ReferenceArrayInput<LooseRecord, typeof resources, "comments">({
      source: "tag_ids",
      // @ts-expect-error "tag_ids" is no resource of the map
      reference: "tag_ids",
    });
  });

  it("a target the referenced record does not have is a type error", () => {
    ReferenceManyField<LooseRecord, typeof resources, "comments">({
      reference: "comments",
      target: "post_id",
    });
    ReferenceManyField<LooseRecord, typeof resources, "comments">({
      reference: "comments",
      // @ts-expect-error "postid" is no key of a comment
      target: "postid",
    });
    ReferenceOneField<LooseRecord, typeof resources, "comments">({
      reference: "comments",
      // @ts-expect-error "title" is a key of a post, not of a comment
      target: "title",
    });
  });

  it("the reference name is inferred from the reference prop", () => {
    postsField({ reference: "comments", target: "post_id" });
    postsField({
      reference: "comments",
      // @ts-expect-error "postid" is no key of a comment
      target: "postid",
    });
    postsField({
      // @ts-expect-error "coments" is no resource of the map
      reference: "coments",
      target: "id",
    });
  });

  it("source stays a path of the current record", () => {
    expectTypeOf<ReferenceFieldProps<Post>["source"]>().toEqualTypeOf<
      SourceProp<Post>
    >();
    ReferenceField<Post, typeof resources, "authors">({
      source: "author_id",
      reference: "authors",
      record: post,
    });
    ReferenceField<Post, typeof resources, "authors">({
      // @ts-expect-error "autor_id" is no path of a post
      source: "autor_id",
      reference: "authors",
      record: post,
    });
    ReferenceManyField<Post, typeof resources, "comments">({
      reference: "comments",
      // @ts-expect-error "postid" is no key of a comment
      target: "postid",
      source: "title",
      record: post,
    });
  });
});
