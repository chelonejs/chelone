import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import type { DataProvider } from "./types";
import { withLifecycleCallbacks } from "./with-lifecycle-callbacks";

const postSchema = z.object({ id: z.number(), title: z.string() });
type Post = z.infer<typeof postSchema>;

const resources = defineResources({
  posts: { schema: postSchema },
  comments: {},
});

describe("withLifecycleCallbacks inference", () => {
  const dp = {} as DataProvider<typeof resources>;

  it("afterGetOne for a named resource receives that resource's record type, and an unknown resource name is rejected", () => {
    withLifecycleCallbacks(dp, [
      {
        resource: "posts",
        afterGetOne: (result) => {
          expectTypeOf(result.data).toEqualTypeOf<Post>();
          return result;
        },
      },
      {
        resource: "*",
        afterGetOne: (result) => {
          expectTypeOf(result.data.id).toEqualTypeOf<string | number>();
          return result;
        },
      },
    ]);

    withLifecycleCallbacks(dp, [
      // @ts-expect-error "widgets" is not in the registry
      { resource: "widgets", afterGetOne: (result: unknown) => result },
    ]);

    expectTypeOf(withLifecycleCallbacks(dp, [])).toEqualTypeOf<
      DataProvider<typeof resources>
    >();
    expectTypeOf(
      withLifecycleCallbacks(dp, [
        { resource: "posts", afterGetOne: (result) => result },
      ]),
    ).toEqualTypeOf<DataProvider<typeof resources>>();
  });

  it("the other verbs' callbacks are typed with the resource's record", () => {
    withLifecycleCallbacks(dp, [
      {
        resource: "posts",
        beforeCreate: (params) => {
          expectTypeOf(params.data).toEqualTypeOf<Partial<Post>>();
          return params;
        },
        afterGetList: (result) => {
          expectTypeOf(result.data).toEqualTypeOf<Post[]>();
          return result;
        },
        beforeUpdate: (params) => {
          expectTypeOf(params.previousData).toEqualTypeOf<Post | undefined>();
          return params;
        },
        afterDeleteMany: (result) => {
          expectTypeOf(result.data).toEqualTypeOf<(string | number)[]>();
          return result;
        },
      },
      {
        resource: "comments",
        afterCreate: (result) => {
          expectTypeOf(result.data.body).toEqualTypeOf<unknown>();
          return result;
        },
      },
    ]);
  });
});
