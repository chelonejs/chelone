import { QueryClient } from "@tanstack/query-core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import type { GetListParams } from "../data/types";
import { defineResources } from "../resource/registry";
import { listFetchParams } from "./list-controller";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
const ctx = {
  dataProvider: fakeDataProvider<typeof resources>({ posts: [] }),
  queryClient: new QueryClient(),
};

describe("listFetchParams", () => {
  it("returns GetListParams", () => {
    expectTypeOf(listFetchParams(ctx, "posts")).toEqualTypeOf<GetListParams>();
  });

  it("checks a sort field against the resource's record", () => {
    listFetchParams(ctx, "posts", { sort: { field: "title", order: "ASC" } });
    listFetchParams(ctx, "posts", {
      // @ts-expect-error `author` is not a field of a post
      sort: { field: "author", order: "ASC" },
    });
  });

  it("checks filter keys against the resource's record", () => {
    listFetchParams(ctx, "posts", { filter: { views: 1, q: "a" } });
    listFetchParams(ctx, "posts", {
      // @ts-expect-error `titel` is misspelled
      filter: { titel: "a" },
    });
  });

  it("rejects a resource that is not registered", () => {
    // @ts-expect-error `comments` is not a resource
    listFetchParams(ctx, "comments");
  });
});
