import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { z as z4 } from "zod/v4";
import type { LooseRecord } from "./record";
import {
  defineResources,
  type RecordOf,
  type ResourceConfig,
} from "./registry";

const postSchema = z.object({ id: z.number(), title: z.string() });
type Post = z.infer<typeof postSchema>;

const resources = defineResources({
  posts: { schema: postSchema },
  comments: {}, // no schema → loose fallback
});
type R = typeof resources;

describe("RecordOf", () => {
  it("infers the record type from a resource's schema", () => {
    expectTypeOf<RecordOf<R, "posts">>().toEqualTypeOf<Post>();
  });

  it("falls back to LooseRecord when a resource has no schema", () => {
    expectTypeOf<RecordOf<R, "comments">>().toEqualTypeOf<LooseRecord>();
  });

  it("defineResources preserves literal keys", () => {
    expectTypeOf<keyof R>().toEqualTypeOf<"posts" | "comments">();
  });
});

describe("ResourceConfig", () => {
  it("accepts a references map of source to resource name", () => {
    expectTypeOf<ResourceConfig["references"]>().toEqualTypeOf<
      { [source: string]: string } | undefined
    >();
    const config: ResourceConfig = {
      schema: postSchema,
      references: { authorId: "users" },
    };
    expectTypeOf(config).toExtend<ResourceConfig>();
  });
});

describe("defineResources with Zod 4", () => {
  it("defineResources accepts a Zod 4 schema and RecordOf infers its output", () => {
    const schema = z4.object({
      id: z4.number(),
      title: z4.string(),
      note: z4.string().optional(),
    });
    const zod4Resources = defineResources({ posts: { schema } });
    expectTypeOf<RecordOf<typeof zod4Resources, "posts">>().toEqualTypeOf<{
      id: number;
      title: string;
      note?: string | undefined;
    }>();
  });
});

describe("defineResources references", () => {
  const authoredSchema = z.object({
    id: z.number(),
    authorId: z.number(),
    title: z.string(),
  });

  it("defineResources accepts a references key that is a field of the schema", () => {
    defineResources({
      posts: { schema: authoredSchema, references: { authorId: "users" } },
      users: {},
    });
  });

  it("defineResources rejects a references key that is not a field of the schema", () => {
    defineResources({
      posts: {
        schema: authoredSchema,
        // @ts-expect-error authorid is not a field of the schema
        references: { authorid: "users" },
      },
      users: {},
    });
  });

  it("defineResources rejects a references target that is not a registered resource", () => {
    defineResources({
      posts: {
        schema: authoredSchema,
        // @ts-expect-error writers is not a registered resource
        references: { authorId: "writers" },
      },
      users: {},
    });
  });

  it("defineResources keeps literal resource names when references are given", () => {
    const registry = defineResources({
      posts: { schema: authoredSchema, references: { authorId: "users" } },
      users: {},
    });
    expectTypeOf<keyof typeof registry>().toEqualTypeOf<"posts" | "users">();
    expectTypeOf<RecordOf<typeof registry, "posts">>().toEqualTypeOf<
      z.infer<typeof authoredSchema>
    >();
  });

  it("a resource with no schema accepts any references key", () => {
    defineResources({
      posts: { references: { anything: "users" } },
      users: {},
    });
  });

  it("defineResources checks references on a Zod 4 schema", () => {
    const schema = z4.object({ id: z4.number(), authorId: z4.number() });
    defineResources({
      posts: { schema, references: { authorId: "users" } },
      users: {},
    });
    defineResources({
      posts: {
        schema,
        // @ts-expect-error authorid is not a field of the Zod 4 schema
        references: { authorid: "users" },
      },
      users: {},
    });
    defineResources({
      posts: {
        schema,
        // @ts-expect-error writers is not a registered resource
        references: { authorId: "writers" },
      },
      users: {},
    });
  });
});
