import { QueryClient } from "@tanstack/query-core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import type { GetListParams, PageInfo } from "../data/types";
import type { Identifier } from "../resource/identifier";
import { defineResources } from "../resource/registry";
import { loadServerListPage } from "./server-list-page";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      author_id: z.number(),
      editor_id: z.number().nullable(),
    }),
  },
  users: { schema: z.object({ id: z.number(), name: z.string() }) },
  tags: { schema: z.object({ id: z.number(), label: z.string() }) },
});
type Post = z.infer<typeof resources.posts.schema>;
type User = z.infer<typeof resources.users.schema>;
type Tag = z.infer<typeof resources.tags.schema>;

const ctx = {
  dataProvider: fakeDataProvider<typeof resources>({}),
  queryClient: new QueryClient(),
};

describe("loadServerListPage", () => {
  it("returns the page and one map per key, valued by the referenced record", async () => {
    const page = await loadServerListPage(ctx, "posts", {
      references: { author_id: "users", editor_id: "tags" },
    });

    expectTypeOf(page.params).toEqualTypeOf<GetListParams>();
    expectTypeOf(page.data).toEqualTypeOf<Post[]>();
    expectTypeOf(page.total).toEqualTypeOf<number | undefined>();
    expectTypeOf(page.pageInfo).toEqualTypeOf<PageInfo | undefined>();
    expectTypeOf(page.references.author_id).toEqualTypeOf<
      ReadonlyMap<Identifier, User>
    >();
    expectTypeOf(page.references.editor_id).toEqualTypeOf<
      ReadonlyMap<Identifier, Tag>
    >();
  });

  it("rejects a references key that is not a key of the record", () => {
    loadServerListPage(ctx, "posts", {
      references: {
        // @ts-expect-error `writer_id` is not a field of a post
        writer_id: "users",
      },
    });
  });

  it("rejects a resource outside the registered ones", () => {
    loadServerListPage(ctx, "posts", {
      references: {
        // @ts-expect-error `ghosts` is not a resource
        author_id: "ghosts",
      },
    });
  });
});
