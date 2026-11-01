import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
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
