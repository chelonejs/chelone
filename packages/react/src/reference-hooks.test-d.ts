import {
  defineResources,
  type LooseRecord,
  type RecordOf,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  type UseReferenceManyFieldControllerOptions,
  type UseReferenceOneFieldControllerOptions,
  useReferenceManyFieldController,
  useReferenceOneFieldController,
} from "./reference-hooks";

const registry = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
  comments: {
    schema: z.object({ id: z.number(), post_id: z.number(), body: z.string() }),
  },
});
type Post = RecordOf<typeof registry, "posts">;
type Comment = RecordOf<typeof registry, "comments">;

const post: Post = { id: 1, title: "one", views: 3 };

describe("useReferenceManyFieldController options", () => {
  it("target is a key of the referenced comment", () => {
    expectTypeOf<
      UseReferenceManyFieldControllerOptions<
        "comments",
        Post,
        Comment
      >["target"]
    >().toEqualTypeOf<SourceKey<Comment>>();
    useReferenceManyFieldController<typeof registry, "comments">({
      reference: "comments",
      target: "post_id",
    });
    useReferenceManyFieldController<typeof registry, "comments">({
      reference: "comments",
      // @ts-expect-error "postid" is not a key of Comment
      target: "postid",
    });
  });

  it("source is a path of the current post", () => {
    expectTypeOf<
      UseReferenceManyFieldControllerOptions<
        "comments",
        Post,
        Comment
      >["source"]
    >().toEqualTypeOf<SourceProp<Post> | undefined>();
    useReferenceManyFieldController<typeof registry, "comments", Post>({
      reference: "comments",
      target: "post_id",
      source: "views",
      record: post,
    });
    useReferenceManyFieldController<typeof registry, "comments", Post>({
      reference: "comments",
      target: "post_id",
      record: post,
      // @ts-expect-error "tittle" is not a path of Post
      source: "tittle",
    });
  });

  it("an unregistered call keeps both props any string", () => {
    expectTypeOf<
      UseReferenceManyFieldControllerOptions["target"]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      UseReferenceManyFieldControllerOptions["source"]
    >().toEqualTypeOf<SourceProp<LooseRecord> | undefined>();
    useReferenceManyFieldController({
      reference: "comments",
      target: "any_column",
      source: "author.roles[0].name",
    });
  });
});

describe("useReferenceOneFieldController options", () => {
  it("target is a key of the referenced comment", () => {
    expectTypeOf<
      UseReferenceOneFieldControllerOptions<"comments", Post, Comment>["target"]
    >().toEqualTypeOf<SourceKey<Comment>>();
    useReferenceOneFieldController<typeof registry, "comments">({
      reference: "comments",
      target: "body",
    });
    useReferenceOneFieldController<typeof registry, "comments">({
      reference: "comments",
      // @ts-expect-error "postid" is not a key of Comment
      target: "postid",
    });
  });

  it("source is a path of the current post", () => {
    expectTypeOf<
      UseReferenceOneFieldControllerOptions<"comments", Post, Comment>["source"]
    >().toEqualTypeOf<SourceProp<Post> | undefined>();
    useReferenceOneFieldController<typeof registry, "comments", Post>({
      reference: "comments",
      target: "post_id",
      source: "title",
      record: post,
    });
    useReferenceOneFieldController<typeof registry, "comments", Post>({
      reference: "comments",
      target: "post_id",
      record: post,
      // @ts-expect-error "tittle" is not a path of Post
      source: "tittle",
    });
  });

  it("an unregistered call keeps both props any string", () => {
    expectTypeOf<
      UseReferenceOneFieldControllerOptions["target"]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      UseReferenceOneFieldControllerOptions["source"]
    >().toEqualTypeOf<SourceProp<LooseRecord> | undefined>();
    useReferenceOneFieldController({
      reference: "comments",
      target: "any_column",
      source: "author.roles[0].name",
    });
  });
});
