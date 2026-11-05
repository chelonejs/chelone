import { QueryClient } from "@tanstack/query-core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { defineResources } from "../resource/registry";
import {
  type ChoicesController,
  type ChoicesControllerState,
  createChoicesController,
} from "./choices-controller";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string() }),
  },
});

type Post = z.infer<typeof resources.posts.schema>;

const ctx = {
  dataProvider: fakeDataProvider<typeof resources>({ posts: [] }),
  queryClient: new QueryClient(),
};

describe("createChoicesController types", () => {
  it("infers the record type from the registry reference", () => {
    const c = createChoicesController(ctx, { reference: "posts" });
    expectTypeOf(c).toEqualTypeOf<ChoicesController<Post>>();
    expectTypeOf(c.getSnapshot()).toEqualTypeOf<ChoicesControllerState<Post>>();
    expectTypeOf(c.getSnapshot().availableChoices).toEqualTypeOf<Post[]>();
    expectTypeOf(c.getSnapshot().selectedChoices).toEqualTypeOf<Post[]>();
    expectTypeOf(c.getSnapshot().allChoices).toEqualTypeOf<Post[]>();
  });

  it("state fields are not `any`", () => {
    const c = createChoicesController(ctx, { reference: "posts" });
    const s = c.getSnapshot();
    expectTypeOf(s.total).not.toBeAny();
    expectTypeOf(s.error).not.toBeAny();
    expectTypeOf(s.availableChoices).not.toBeAny();
  });

  it("the state error is Error or null", () => {
    expectTypeOf<
      ChoicesControllerState<Post>["error"]
    >().toEqualTypeOf<Error | null>();
  });

  it("lookupKey takes a key of the referenced record", () => {
    createChoicesController(ctx, { reference: "posts", lookupKey: "title" });
    // @ts-expect-error `slug` is not a key of Post
    createChoicesController(ctx, { reference: "posts", lookupKey: "slug" });
  });

  it("setValue accepts scalar and array identifiers", () => {
    const c = createChoicesController(ctx, { reference: "posts" });
    expectTypeOf(c.setValue).parameter(0).toEqualTypeOf<unknown>();
  });
});
