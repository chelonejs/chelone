/**
 * The date inputs under a resource: `defaultValue` is the value at `source`,
 * every `parse` takes the string the DOM input holds, and a misspelt `source`
 * fails. `createResourceComponentsOf` takes the map as a type argument, so no
 * `Register` augmentation is needed.
 */
import {
  defineResources,
  type RecordOf,
  type SourceValue,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../create-resource-components";

const resources = defineResources({
  posts: {
    schema: z.object({
      publishedAt: z.date().nullable(),
      views: z.number(),
      title: z.string(),
    }),
  },
});

type Post = RecordOf<typeof resources, "posts">;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

/**
 * Whether `A` and `B` accept the same values. `toEqualTypeOf` reads the
 * factory's `NoInfer` wrapper as a different type, so the `defaultValue`
 * checks compare through this instead.
 */
type Mutual<A, B> = [B] extends [A] ? ([A] extends [B] ? true : false) : false;

const date = posts.DateInput<"publishedAt">;
const dateTime = posts.DateTimeInput<"publishedAt">;
const time = posts.TimeInput<"publishedAt">;

describe("the date inputs under a resource", () => {
  it("each input takes a defaultValue typed by the value at source", () => {
    expectTypeOf<
      Mutual<
        Parameters<typeof date>[0]["defaultValue"],
        SourceValue<Post, "publishedAt"> | undefined
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Mutual<
        Parameters<typeof dateTime>[0]["defaultValue"],
        SourceValue<Post, "publishedAt"> | undefined
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Mutual<
        Parameters<typeof time>[0]["defaultValue"],
        SourceValue<Post, "publishedAt"> | undefined
      >
    >().toEqualTypeOf<true>();
  });

  it("each parse takes the string the DOM input holds", () => {
    expectTypeOf<
      Parameters<NonNullable<Parameters<typeof date>[0]["parse"]>>[0]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      Parameters<NonNullable<Parameters<typeof dateTime>[0]["parse"]>>[0]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      Parameters<NonNullable<Parameters<typeof time>[0]["parse"]>>[0]
    >().toEqualTypeOf<string>();
  });

  it("each input rejects a misspelt source", () => {
    // @ts-expect-error `publishedAtt` is no path of a post
    posts.DateInput<"publishedAtt">;
    // @ts-expect-error `publishedAtt` is no path of a post
    posts.DateTimeInput<"publishedAtt">;
    // @ts-expect-error `publishedAtt` is no path of a post
    posts.TimeInput<"publishedAtt">;
  });
});
