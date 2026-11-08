import { QueryClient } from "@tanstack/query-core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import type { SortPayload } from "../data/types";
import { defineResources } from "../resource/registry";
import {
  type ChoiceRecord,
  type ChoicesController,
  type ChoicesControllerState,
  choiceListsOf,
  createChoicesController,
  eraseChoicesController,
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
    expectTypeOf(c).toEqualTypeOf<ChoicesController<Post, "posts">>();
    expectTypeOf(c.getSnapshot()).toEqualTypeOf<
      ChoicesControllerState<Post, "posts">
    >();
    expectTypeOf(c.getSnapshot().resource).toEqualTypeOf<"posts">();
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

  it("the state resource is a string unless the name is given", () => {
    expectTypeOf<
      ChoicesControllerState<Post>["resource"]
    >().toEqualTypeOf<string>();
  });

  it("sort takes a path of the referenced record", () => {
    createChoicesController(ctx, {
      reference: "posts",
      sort: { field: "title", order: "ASC" },
    });
    createChoicesController(ctx, {
      reference: "posts",
      // @ts-expect-error `titel` is not a path of Post
      sort: { field: "titel", order: "ASC" },
    });
  });

  it("setSort takes a path of the referenced record", () => {
    const c = createChoicesController(ctx, { reference: "posts" });
    c.setSort({ field: "title", order: "ASC" });
    // @ts-expect-error `titel` is not a path of Post
    c.setSort({ field: "titel", order: "ASC" });
    expectTypeOf(c.getSnapshot().sort).toEqualTypeOf<SortPayload<Post>>();
  });

  it("setValue accepts scalar and array identifiers", () => {
    const c = createChoicesController(ctx, { reference: "posts" });
    expectTypeOf(c.setValue).parameter(0).toEqualTypeOf<unknown>();
  });

  it("choiceListsOf erases the three lists to ChoiceRecord", () => {
    const c = createChoicesController(ctx, { reference: "posts" });
    const lists = choiceListsOf(c.getSnapshot());
    expectTypeOf(lists.allChoices).toEqualTypeOf<ChoiceRecord[]>();
    expectTypeOf(lists.availableChoices).toEqualTypeOf<ChoiceRecord[]>();
    expectTypeOf(lists.selectedChoices).toEqualTypeOf<ChoiceRecord[]>();
  });

  it("eraseChoicesController erases the sort and filter to ChoiceRecord", () => {
    const c = createChoicesController(ctx, { reference: "posts" });
    const erased = eraseChoicesController(c);
    expectTypeOf(erased).toEqualTypeOf<ChoicesController<ChoiceRecord>>();
    expectTypeOf(erased.getSnapshot().sort).toEqualTypeOf<
      SortPayload<ChoiceRecord>
    >();
  });
});
