import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { getListOptions } from "../data/query-options";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import {
  createListController,
  type ListControllerOptions,
  listFetchParams,
} from "./list-controller";
import { listPatchFromSearch, serializeListParams } from "./list-params";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      views: z.number(),
    }),
  },
});
type Post = z.infer<typeof resources.posts.schema>;

const rows: Post[] = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
  views: i % 5,
}));

function makeCtx() {
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const getList = vi.spyOn(dataProvider, "getList");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  return { dataProvider, queryClient, getList };
}

/** The list queries in the cache; fetched rows also seed one `getOne` entry each. */
const listQueries = (queryClient: QueryClient) =>
  queryClient.getQueryCache().findAll({ queryKey: ["posts", "getList"] });

/** What a route loader does: build the params, then `fetchQuery` the list options. */
async function load(
  ctx: ReturnType<typeof makeCtx> & { store?: ReturnType<typeof createStore> },
  options: ListControllerOptions<Post>,
  search: string,
) {
  await ctx.queryClient.fetchQuery(
    getListOptions(
      ctx,
      "posts",
      listFetchParams(ctx, "posts", options, search),
    ),
  );
}

/** Mounts a list the way an adapter does: seed from the URL while inert, then subscribe. */
async function mount(
  ctx: ReturnType<typeof makeCtx> & { store?: ReturnType<typeof createStore> },
  options: ListControllerOptions<Post>,
  search: string,
) {
  const controller = createListController(ctx, "posts", options);
  const patch = listPatchFromSearch<Post>(search);
  if (patch) controller.setParams(patch);
  const unsubscribe = controller.subscribe(() => {});
  await vi.waitFor(() =>
    expect(controller.getSnapshot().isPending).toBe(false),
  );
  return () => {
    unsubscribe();
    controller.destroy();
  };
}

describe("listFetchParams", () => {
  it("a loader and a mounted list share one query key", async () => {
    const ctx = makeCtx();
    const search = serializeListParams<Post>({
      filter: { views: 2 },
      sort: "title",
      order: "DESC",
      perPage: 5,
      page: 2,
    });

    await load(ctx, {}, search);
    const release = await mount(ctx, {}, search);

    expect(listQueries(ctx.queryClient)).toHaveLength(1);
    expect(ctx.getList).toHaveBeenCalledTimes(1);
    expect(ctx.getList).toHaveBeenCalledWith("posts", {
      pagination: { page: 2, perPage: 5 },
      sort: { field: "title", order: "DESC" },
      filter: { views: 2 },
    });
    release();
  });

  it("accepts a search string with or without a leading question mark", () => {
    const ctx = makeCtx();
    expect(listFetchParams(ctx, "posts", {}, "?perPage=7&page=2")).toEqual(
      listFetchParams(ctx, "posts", {}, "perPage=7&page=2"),
    );
  });

  it("option defaults and a permanent filter reach the same key", async () => {
    const ctx = makeCtx();
    const options: ListControllerOptions<Post> = {
      perPage: 15,
      sort: { field: "views", order: "DESC" },
      filter: { views: 0 },
      filterDefaultValues: { title: "t1" },
    };

    await load(ctx, options, "");
    const release = await mount(ctx, options, "");

    expect(listQueries(ctx.queryClient)).toHaveLength(1);
    expect(ctx.getList).toHaveBeenCalledTimes(1);
    expect(ctx.getList).toHaveBeenCalledWith("posts", {
      pagination: { page: 1, perPage: 15 },
      sort: { field: "views", order: "DESC" },
      filter: { title: "t1", views: 0 },
    });
    release();
  });

  it("sends a sort array when the list sorts on several keys", () => {
    const ctx = makeCtx();
    expect(
      listFetchParams(ctx, "posts", {
        sort: [
          { field: "views", order: "DESC" },
          { field: "title", order: "ASC" },
        ],
      }).sort,
    ).toEqual([
      { field: "views", order: "DESC" },
      { field: "title", order: "ASC" },
    ]);
  });

  it("a persisted param the server cannot read changes the key", async () => {
    const ctx = makeCtx();
    const store = createStore();
    store.setItem("posts.listParams", { perPage: 25 });

    await load(ctx, {}, "");
    const release = await mount({ ...ctx, store }, {}, "");

    expect(listQueries(ctx.queryClient)).toHaveLength(2);
    expect(ctx.getList).toHaveBeenCalledTimes(2);
    release();
  });

  it("a loader given the store matches persisted params", async () => {
    const ctx = { ...makeCtx(), store: createStore() };
    ctx.store.setItem("posts.listParams", { perPage: 25 });

    await load(ctx, {}, "");
    const release = await mount(ctx, {}, "");

    expect(listQueries(ctx.queryClient)).toHaveLength(1);
    expect(ctx.getList).toHaveBeenCalledTimes(1);
    expect(ctx.getList.mock.calls[0]?.[1]?.pagination).toEqual({
      page: 1,
      perPage: 25,
    });
    release();
  });

  it("storeKey false makes server and client match", async () => {
    const ctx = makeCtx();
    const store = createStore();
    store.setItem("posts.listParams", { perPage: 25 });
    const options: ListControllerOptions<Post> = { storeKey: false };

    await load(ctx, options, "");
    const release = await mount({ ...ctx, store }, options, "");

    expect(listQueries(ctx.queryClient)).toHaveLength(1);
    expect(ctx.getList).toHaveBeenCalledTimes(1);
    release();
  });

  it("reads persisted params from the storeKey option", () => {
    const store = createStore();
    store.setItem("custom.listParams", { page: 4 });
    const ctx = { ...makeCtx(), store };
    expect(
      listFetchParams(ctx, "posts", { storeKey: "custom" }).pagination,
    ).toEqual({ page: 4, perPage: 10 });
  });
});
