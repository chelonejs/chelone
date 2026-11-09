import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { defineResources } from "../resource/registry";
import { listFetchParams } from "./list-controller";
import { serializeListParams } from "./list-params";
import { loadServerListPage } from "./server-list-page";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      author_id: z.number().nullable(),
      editor_id: z.number().nullable(),
    }),
  },
  users: { schema: z.object({ id: z.number(), name: z.string() }) },
});
type Post = z.infer<typeof resources.posts.schema>;

const users = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Bo" },
  { id: 3, name: "Cy" },
  { id: 4, name: "Di" },
];

function makeCtx(posts: Post[]) {
  const dataProvider = fakeDataProvider<typeof resources>({
    posts,
    users: structuredClone(users),
  });
  const getList = vi.spyOn(dataProvider, "getList");
  const getMany = vi.spyOn(dataProvider, "getMany");
  return {
    dataProvider,
    queryClient: new QueryClient(),
    getList,
    getMany,
  };
}

const post = (
  id: number,
  author_id: number | null,
  editor_id: number | null,
): Post => ({ id, title: `t${id}`, author_id, editor_id });

describe("loadServerListPage", () => {
  it("fetches with exactly the params a mounted list would", async () => {
    const ctx = makeCtx([post(1, 1, null), post(2, 2, null), post(3, 3, null)]);
    const search = serializeListParams<Post>({
      filter: { author_id: 2 },
      sort: "title",
      order: "DESC",
      perPage: 5,
    });
    const options = { filter: { editor_id: null } };

    const page = await loadServerListPage(ctx, "posts", {
      options,
      search,
      references: { author_id: "users" },
    });

    const expected = listFetchParams(ctx, "posts", options, search);
    expect(ctx.getList).toHaveBeenCalledTimes(1);
    expect(ctx.getList).toHaveBeenCalledWith("posts", expected);
    expect(page.params).toEqual(expected);
  });

  it("returns the page's data, total and referenced records by id", async () => {
    const ctx = makeCtx([post(1, 1, null), post(2, 3, null)]);

    const page = await loadServerListPage(ctx, "posts", {
      references: { author_id: "users" },
    });

    expect(page.data.map((row) => row.id)).toEqual([1, 2]);
    expect(page.total).toBe(2);
    expect(page.references.author_id.get(3)).toEqual({ id: 3, name: "Cy" });
    expect(page.references.author_id.get(2)).toBeUndefined();
  });

  it("makes one getMany for two keys naming one resource, ids in first-seen order", async () => {
    const ctx = makeCtx([post(1, 3, 1), post(2, 1, 4), post(3, 3, 2)]);

    const page = await loadServerListPage(ctx, "posts", {
      references: { author_id: "users", editor_id: "users" },
    });

    expect(ctx.getMany).toHaveBeenCalledTimes(1);
    expect(ctx.getMany).toHaveBeenCalledWith("users", { ids: [3, 1, 4, 2] });
    expect(page.references.editor_id.get(4)).toEqual({ id: 4, name: "Di" });
    expect(page.references.author_id.get(1)).toEqual({ id: 1, name: "Ada" });
  });

  it("drops nullish ids and makes no getMany for a resource with none", async () => {
    const ctx = makeCtx([post(1, 2, null), post(2, null, null)]);

    const page = await loadServerListPage(ctx, "posts", {
      references: { author_id: "users" },
    });
    expect(ctx.getMany).toHaveBeenCalledTimes(1);
    expect(ctx.getMany).toHaveBeenCalledWith("users", { ids: [2] });
    expect(page.references.author_id.size).toBe(1);

    const bare = makeCtx([post(1, null, 4)]);
    const none = await loadServerListPage(bare, "posts", {
      references: { author_id: "users" },
    });
    expect(bare.getMany).not.toHaveBeenCalled();
    expect(none.references.author_id.size).toBe(0);
  });

  it("makes no getMany for an empty page", async () => {
    const ctx = makeCtx([]);

    const page = await loadServerListPage(ctx, "posts", {
      references: { author_id: "users", editor_id: "users" },
    });

    expect(page.data).toEqual([]);
    expect(ctx.getMany).not.toHaveBeenCalled();
    expect(page.references.editor_id.size).toBe(0);
  });

  it("rejects the load when getMany rejects", async () => {
    const ctx = makeCtx([post(1, 1, null)]);
    ctx.getMany.mockRejectedValueOnce(new Error("users are down"));

    await expect(
      loadServerListPage(ctx, "posts", {
        references: { author_id: "users" },
      }),
    ).rejects.toThrow("users are down");
  });

  it("rejects the load when getList rejects, before any getMany", async () => {
    const ctx = makeCtx([post(1, 1, null)]);
    ctx.getList.mockRejectedValueOnce(new Error("posts are down"));

    await expect(
      loadServerListPage(ctx, "posts", {
        references: { author_id: "users" },
      }),
    ).rejects.toThrow("posts are down");
    expect(ctx.getMany).not.toHaveBeenCalled();
  });
});
