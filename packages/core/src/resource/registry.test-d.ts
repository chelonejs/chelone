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
