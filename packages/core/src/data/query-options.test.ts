import { QueryClient } from "@tanstack/query-core";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { oneKey } from "./keys";
import {
  getInfiniteListOptions,
  getListOptions,
  getManyOptions,
  getManyReferenceOptions,
  getOneOptions,
} from "./query-options";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
const ctx = () => ({
  dataProvider: fakeDataProvider<typeof resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
  }),
  queryClient: new QueryClient(),
});

describe("query option factories", () => {
  it("getListOptions fetches via fetchQuery and returns the typed result", async () => {
    const c = ctx();
    const result = await c.queryClient.fetchQuery(
      getListOptions(c, "posts", {}),
    );
    expect(result.data.map((p) => p.title)).toEqual(["a", "b"]);
    expectTypeOf(result.data).toEqualTypeOf<{ id: number; title: string }[]>();
  });

  it("getList seeds the getOne cache for each row (cross-population)", async () => {
    const c = ctx();
    await c.queryClient.fetchQuery(getListOptions(c, "posts", {}));
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({
      id: 1,
      title: "a",
    });
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 2 })),
    ).toMatchObject({
      id: 2,
      title: "b",
    });
  });

  it("getOneOptions caches the record under the stringified-id key", async () => {
    const c = ctx();
    const record = await c.queryClient.fetchQuery(
      getOneOptions(c, "posts", { id: "1" }),
    );
    expect(record.title).toBe("a");
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ id: 1 });
  });

  it("getManyOptions seeds oneKey slots", async () => {
    const c = ctx();
    await c.queryClient.fetchQuery(getManyOptions(c, "posts", { ids: [2] }));
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 2 })),
    ).toMatchObject({ id: 2 });
  });
});

describe("getManyReferenceOptions", () => {
  const refResources = defineResources({
    comments: {
      schema: z.object({
        id: z.number(),
        post_id: z.number(),
        body: z.string(),
      }),
    },
  });
  const refCtx = () => ({
    dataProvider: fakeDataProvider<typeof refResources>({
      comments: [
        { id: 1, post_id: 1, body: "a" },
        { id: 2, post_id: 2, body: "b" },
        { id: 3, post_id: 1, body: "c" },
      ],
    }),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
  });
  const params = () => ({
    target: "post_id",
    id: 1,
    pagination: { page: 1, perPage: 10 },
  });

  it("getManyReferenceOptions calls getManyReference with the target, id and paging and returns the typed list result", async () => {
    const c = refCtx();
    const spy = vi.spyOn(c.dataProvider, "getManyReference");
    const result = await c.queryClient.fetchQuery(
      getManyReferenceOptions(c, "comments", params()),
    );
    expect(spy).toHaveBeenCalledWith("comments", params());
    expect(result.data.map((r) => r.body)).toEqual(["a", "c"]);
    expect(result.total).toBe(2);
    expectTypeOf(result.data).toEqualTypeOf<
      { id: number; post_id: number; body: string }[]
    >();
  });

  it("getManyReferenceOptions seeds oneKey slots for every returned row", async () => {
    const c = refCtx();
    await c.queryClient.fetchQuery(
      getManyReferenceOptions(c, "comments", params()),
    );
    expect(
      c.queryClient.getQueryData(oneKey("comments", { id: 1 })),
    ).toMatchObject({ id: 1, body: "a" });
    expect(
      c.queryClient.getQueryData(oneKey("comments", { id: 3 })),
    ).toMatchObject({ id: 3, body: "c" });
    expect(
      c.queryClient.getQueryData(oneKey("comments", { id: 2 })),
    ).toBeUndefined();
  });

  it("getManyReferenceOptions rejects with the provider error and caches nothing", async () => {
    const c = refCtx();
    const boom = new Error("boom");
    vi.spyOn(c.dataProvider, "getManyReference").mockRejectedValue(boom);
    const options = getManyReferenceOptions(c, "comments", params());
    await expect(c.queryClient.fetchQuery(options)).rejects.toBe(boom);
    expect(c.queryClient.getQueryData(options.queryKey)).toBeUndefined();
    for (const id of [1, 2, 3]) {
      expect(
        c.queryClient.getQueryData(oneKey("comments", { id })),
      ).toBeUndefined();
    }
  });
});

describe("getInfiniteListOptions", () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: i + 1, title: `t${i + 1}` }));
  const infCtx = (count = 5) => ({
    dataProvider: fakeDataProvider<typeof resources>({ posts: rows(count) }),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
  });
  const params = () => ({
    pagination: { page: 1, perPage: 2 },
    sort: { field: "id", order: "DESC" as const },
    filter: {},
  });
  const row = (id: number) => ({ id, title: `t${id}` });

  it("getInfiniteListOptions fetches the first page, then the next page with the same filter and sort", async () => {
    const c = infCtx();
    const spy = vi.spyOn(c.dataProvider, "getList");
    const result = await c.queryClient.fetchInfiniteQuery({
      ...getInfiniteListOptions(c, "posts", params()),
      pages: 2,
    });
    expect(spy).toHaveBeenNthCalledWith(1, "posts", {
      ...params(),
      pagination: { page: 1, perPage: 2 },
    });
    expect(spy).toHaveBeenNthCalledWith(2, "posts", {
      ...params(),
      pagination: { page: 2, perPage: 2 },
    });
    expect(result.pageParams).toEqual([1, 2]);
    expect(result.pages.map((p) => p.data.map((r) => r.id))).toEqual([
      [5, 4],
      [3, 2],
    ]);
    expectTypeOf(result.pages[0]?.data).toEqualTypeOf<
      { id: number; title: string }[]
    >();
  });

  it("getInfiniteListOptions starts at params.pagination.page", () => {
    const c = infCtx();
    const options = getInfiniteListOptions(c, "posts", {
      pagination: { page: 3, perPage: 2 },
    });
    expect(options.initialPageParam).toBe(3);
  });

  it("getInfiniteListOptions has no next page once pageInfo.hasNextPage is false", () => {
    const options = getInfiniteListOptions(infCtx(), "posts", params());
    const full = [row(1), row(2)];
    expect(
      options.getNextPageParam(
        { data: full, total: 99, pageInfo: { hasNextPage: false } },
        [],
        1,
        [1],
      ),
    ).toBeUndefined();
    expect(
      options.getNextPageParam(
        { data: [row(1)], pageInfo: { hasNextPage: true } },
        [],
        1,
        [1],
      ),
    ).toBe(2);
  });

  it("getInfiniteListOptions has no next page once loaded rows reach total", () => {
    const options = getInfiniteListOptions(infCtx(), "posts", params());
    const p1 = { data: [row(1), row(2)], total: 3 };
    const p2 = { data: [row(3), row(4)], total: 4 };
    expect(options.getNextPageParam(p1, [p1], 1, [1])).toBe(2);
    expect(options.getNextPageParam(p2, [p1, p2], 2, [1, 2])).toBeUndefined();
  });

  it("getInfiniteListOptions treats a short last page as the end when total and pageInfo are absent", () => {
    const options = getInfiniteListOptions(infCtx(), "posts", params());
    expect(
      options.getNextPageParam({ data: [row(1), row(2)] }, [], 4, [4]),
    ).toBe(5);
    expect(
      options.getNextPageParam({ data: [row(1)] }, [], 4, [4]),
    ).toBeUndefined();
  });

  it("getInfiniteListOptions has no previous page at page 1 and page - 1 after", () => {
    const options = getInfiniteListOptions(infCtx(), "posts", params());
    const page = { data: [row(1)] };
    expect(options.getPreviousPageParam(page, [page], 1, [1])).toBeUndefined();
    expect(options.getPreviousPageParam(page, [page], 3, [3])).toBe(2);
  });

  it("getInfiniteListOptions seeds oneKey slots for the rows of every page", async () => {
    const c = infCtx();
    await c.queryClient.fetchInfiniteQuery({
      ...getInfiniteListOptions(c, "posts", params()),
      pages: 2,
    });
    for (const id of [2, 3, 4, 5]) {
      expect(c.queryClient.getQueryData(oneKey("posts", { id }))).toEqual(
        row(id),
      );
    }
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toBeUndefined();
  });

  it("getInfiniteListOptions rejects with the provider error and caches nothing", async () => {
    const c = infCtx();
    const boom = new Error("boom");
    vi.spyOn(c.dataProvider, "getList").mockRejectedValue(boom);
    const options = getInfiniteListOptions(c, "posts", params());
    await expect(c.queryClient.fetchInfiniteQuery(options)).rejects.toBe(boom);
    expect(c.queryClient.getQueryData(options.queryKey)).toBeUndefined();
    for (const id of [1, 2, 3, 4, 5]) {
      expect(
        c.queryClient.getQueryData(oneKey("posts", { id })),
      ).toBeUndefined();
    }
  });
});
