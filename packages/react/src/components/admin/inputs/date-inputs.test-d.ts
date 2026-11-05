/**
 * The date inputs under a resource: `defaultValue` is the value at `source`,
 * every `parse` takes the string the DOM input holds, and a misspelt `source`
 * fails. `createResourceComponentsOf` takes the map as a type argument, so no
 * `Register` augmentation is needed.
 */
import { defineResources, type SourceValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../resource/create-resource-components";

const resources = defineResources({
  posts: {
    schema: z.object({
      title: z.string(),
      publishedAt: z.date().nullable(),
    }),
  },
});

type Post = z.infer<(typeof resources)["posts"]["schema"]>;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

/**
 * Whether `A` and `B` accept the same values. `toEqualTypeOf` reads the
 * factory's `NoInfer` wrapper as a different type, so the `defaultValue`
 * checks compare through this instead.
 */
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Props<T> = T extends (props: infer P) => unknown ? P : never;

describe("the date inputs under a resource", () => {
  it("DateInput takes a defaultValue typed by the value at source", () => {
    expectTypeOf<
      Mutual<
        Parameters<typeof posts.DateInput<"publishedAt">>[0]["defaultValue"],
        SourceValue<Post, "publishedAt"> | undefined
      >
    >().toEqualTypeOf<true>();
  });

  it("DateTimeInput and TimeInput take the same defaultValue", () => {
    expectTypeOf<
      Mutual<
        Parameters<
          typeof posts.DateTimeInput<"publishedAt">
        >[0]["defaultValue"],
        SourceValue<Post, "publishedAt"> | undefined
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Mutual<
        Parameters<typeof posts.TimeInput<"publishedAt">>[0]["defaultValue"],
        SourceValue<Post, "publishedAt"> | undefined
      >
    >().toEqualTypeOf<true>();
  });

  it("each parse takes the string the DOM input holds", () => {
    expectTypeOf<
      Parameters<
        NonNullable<
          Parameters<typeof posts.DateInput<"publishedAt">>[0]["parse"]
        >
      >[0]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      Parameters<
        NonNullable<
          Parameters<typeof posts.DateTimeInput<"publishedAt">>[0]["parse"]
        >
      >[0]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      Parameters<
        NonNullable<
          Parameters<typeof posts.TimeInput<"publishedAt">>[0]["parse"]
        >
      >[0]
    >().toEqualTypeOf<string>();
  });

  it("each input rejects a misspelt source", () => {
    const date: Props<typeof posts.DateInput> = {
      // @ts-expect-error `publishedAtt` is no path of a post
      source: "publishedAtt",
    };
    const dateTime: Props<typeof posts.DateTimeInput> = {
      // @ts-expect-error `publishedAtt` is no path of a post
      source: "publishedAtt",
    };
    const time: Props<typeof posts.TimeInput> = {
      // @ts-expect-error `publishedAtt` is no path of a post
      source: "publishedAtt",
    };
    void [date, dateTime, time];
  });
});
