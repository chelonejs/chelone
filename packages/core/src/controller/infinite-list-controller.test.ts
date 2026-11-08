import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { getListOptions } from "../data/query-options";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import { createInfiniteListController } from "./infinite-list-controller";

// `looseObject` on purpose: these tests filter on plain field names, and a
// strict record keys its filter by `FilterSourceKey` — `q` plus operator
// suffixes only. Filter-key typing is pinned in source-path.test-d.ts.
const resources = defineResources({
  posts: {
    schema: z.looseObject({
      id: z.number(),
      title: z.string(),
      views: z.number(),
    }),
  },
});
const rows = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${String(i + 1).padStart(2, "0")}`,
  views: (i * 7) % 5,
}));

function makeCtx() {
  return {
    dataProvider: fakeDataProvider<typeof resources>({
      posts: structuredClone(rows),
    }),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    store: createStore(),
    notifications: createNotificationStore(),
  };
}
const settled = async (c: {
  getSnapshot: () => { isPending: boolean; isFetching: boolean };
}) =>
  vi.waitFor(() => {
    expect(c.getSnapshot().isPending).toBe(false);
    expect(c.getSnapshot().isFetching).toBe(false);
  });

/** Construction is inert: attach explicitly, as a vanilla consumer would. */
const attach = (c: { subscribe: (cb: () => void) => () => void }) =>
  c.subscribe(() => {});

/** Live QueryObserver subscriptions across the whole cache. */
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);

/** Delays the provider: the nth call waits `delays[n]` ms (the last entry repeats). */
const slowProvider = (ctx: ReturnType<typeof makeCtx>, delays: number[]) => {
  const real = ctx.dataProvider.getList.bind(ctx.dataProvider);
  let call = 0;
  return vi
    .spyOn(ctx.dataProvider, "getList")
    .mockImplementation(async (resource, params) => {
      const wait = delays[Math.min(call++, delays.length - 1)] ?? 0;
      await new Promise((resolve) => setTimeout(resolve, wait));
      return real(resource, params);
    });
};

const ids = (c: {
  getSnapshot: () => { data: { id: number }[] | undefined };
}) => c.getSnapshot().data?.map((r) => r.id);
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("createInfiniteListController", () => {
  beforeEach(() => vi.useRealTimers());

  it("fetches page 1 on the first subscribe and exposes the rows and the total", async () => {
    const ctx = makeCtx();
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    const c = createInfiniteListController(ctx, "posts", {});
    expect(getList).not.toHaveBeenCalled();
    attach(c);
    await settled(c);
    const s = c.getSnapshot();
    expect(ids(c)).toEqual(range(1, 10));
    expect(s.total).toBe(25);
    expect(s.page).toBe(1);
    expect(s.hasNextPage).toBe(true);
    expect(s.hasPreviousPage).toBe(false);
    expect(s.isFetchingNextPage).toBe(false);
    expect(s.isFetchingPreviousPage).toBe(false);
    expect(getList).toHaveBeenCalledTimes(1);
    c.destroy();
  });

  it("fetchNextPage appends page 2 after the rows of page 1", async () => {
    const c = createInfiniteListController(makeCtx(), "posts", {});
    attach(c);
    await settled(c);
    await c.fetchNextPage();
    const s = c.getSnapshot();
    expect(ids(c)).toEqual(range(1, 20));
    expect(s.page).toBe(1);
    expect(s.total).toBe(25);
    expect(s.hasNextPage).toBe(true);
    c.destroy();
  });

  it("fetchNextPage on the last page makes no provider call and hasNextPage stays false", async () => {
    const ctx = makeCtx();
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    await c.fetchNextPage();
    await c.fetchNextPage();
    expect(ids(c)).toEqual(range(1, 25));
    expect(c.getSnapshot().hasNextPage).toBe(false);
    getList.mockClear();
    await c.fetchNextPage();
    expect(getList).not.toHaveBeenCalled();
    expect(c.getSnapshot().hasNextPage).toBe(false);
    expect(ids(c)).toEqual(range(1, 25));
    c.destroy();
  });

  it("fetchNextPage while a page is loading fetches it only once", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    await Promise.all([c.fetchNextPage(), c.fetchNextPage()]);
    expect(getList).toHaveBeenCalledTimes(1);
    expect(ids(c)).toEqual(range(1, 20));
    c.destroy();
  });

  it("setFilters drops the loaded pages and refetches from page 1", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    await c.fetchNextPage();
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    c.setFilters({ views: 0 });
    expect(c.getSnapshot().page).toBe(1);
    expect(c.getSnapshot().filter).toEqual({ views: 0 });
    await vi.waitFor(() => expect(c.getSnapshot().isFetching).toBe(false));
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList.mock.calls[0]?.[1]).toMatchObject({
      pagination: { page: 1 },
      filter: { views: 0 },
    });
    const expected = rows.filter((r) => r.views === 0).map((r) => r.id);
    expect(ids(c)).toEqual(expected.slice(0, 10));
    expect(c.getSnapshot().total).toBe(expected.length);
    c.destroy();
  });

  it("setSort and setPerPage restart from page 1", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    await c.fetchNextPage();
    c.setSort({ field: "id", order: "DESC" });
    await vi.waitFor(() => expect(ids(c)).toEqual(range(16, 25).reverse()));
    await c.fetchNextPage();
    expect(ids(c)).toEqual(range(6, 25).reverse());
    c.setPerPage(5);
    await vi.waitFor(() => expect(ids(c)).toEqual(range(21, 25).reverse()));
    expect(c.getSnapshot().page).toBe(1);
    expect(c.getSnapshot().perPage).toBe(5);
    c.destroy();
  });

  it("setPage restarts loading at that page and fetchPreviousPage loads the page before it", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    c.setPage(3);
    await vi.waitFor(() => expect(ids(c)).toEqual(range(21, 25)));
    expect(c.getSnapshot().page).toBe(3);
    expect(c.getSnapshot().hasPreviousPage).toBe(true);
    expect(c.getSnapshot().hasNextPage).toBe(false);
    await c.fetchPreviousPage();
    expect(ids(c)).toEqual(range(11, 25));
    await c.fetchPreviousPage();
    expect(ids(c)).toEqual(range(1, 25));
    expect(c.getSnapshot().hasPreviousPage).toBe(false);
    c.destroy();
  });

  it("the permanent filter merges over the user filter for every page", async () => {
    const ctx = makeCtx();
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    const c = createInfiniteListController(ctx, "posts", {
      filter: { views: 1 },
      perPage: 2,
    });
    attach(c);
    await settled(c);
    // The permanent value wins, so the effective query is unchanged: no refetch.
    c.setFilters({ views: 4 });
    await c.fetchNextPage();
    expect(
      getList.mock.calls.map(([, params]) => [
        params?.pagination,
        params?.filter,
      ]),
    ).toEqual([
      [{ page: 1, perPage: 2 }, { views: 1 }],
      [{ page: 2, perPage: 2 }, { views: 1 }],
    ]);
    const permanent = rows.filter((r) => r.views === 1).map((r) => r.id);
    expect(ids(c)).toEqual(permanent.slice(0, 4));
    expect(c.getSnapshot().filter).toEqual({ views: 4 });
    c.destroy();
  });

  it("selection persists in the store across pages and across controller instances", async () => {
    const ctx = makeCtx();
    const c1 = createInfiniteListController(ctx, "posts", {});
    attach(c1);
    await settled(c1);
    c1.toggleItem(1);
    await c1.fetchNextPage();
    c1.toggleItem(15);
    expect(c1.getSnapshot().selectedIds).toEqual([1, 15]);
    c1.destroy();
    const c2 = createInfiniteListController(ctx, "posts", {});
    expect(c2.getSnapshot().selectedIds).toEqual([1, 15]);
    attach(c2);
    await settled(c2);
    c2.unselectAll();
    expect(c2.getSnapshot().selectedIds).toEqual([]);
    c2.select([3]);
    expect(c2.getSnapshot().selectedIds).toEqual([3]);
    c2.destroy();
  });

  it("selectAll selects up to the limit and warns when the limit is reached", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    await c.selectAll({ limit: 10 });
    expect(c.getSnapshot().selectedIds).toEqual(range(1, 10));
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "chelone.message.select_all_limit_reached"),
    ).toBe(true);
    c.destroy();
  });

  it("refetch reloads every loaded page", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    await c.fetchNextPage();
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    c.refetch();
    await vi.waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(c.getSnapshot().isFetching).toBe(false));
    expect(getList.mock.calls.map(([, params]) => params?.pagination)).toEqual([
      { page: 1, perPage: 10 },
      { page: 2, perPage: 10 },
    ]);
    expect(ids(c)).toEqual(range(1, 20));
    c.destroy();
  });

  it("a provider error notifies once and keeps the loaded pages", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValueOnce(
      new Error("boom"),
    );
    await c.fetchNextPage();
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    expect(ids(c)).toEqual(range(1, 10));
    const errors = ctx.notifications
      .getSnapshot()
      .filter((n) => n.type === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("boom");
    expect(errors[0]?.messageArgs).toEqual({ _: "Error: boom" });
    c.destroy();
  });

  it("a provider error with an empty message falls back to chelone.notification.http_error", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValue(new Error(""));
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "chelone.notification.http_error"),
    ).toBe(true);
    c.destroy();
  });

  it("storeKey false keeps params and selection out of the store", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", { storeKey: false });
    attach(c);
    await settled(c);
    c.setPerPage(5);
    c.toggleItem(1);
    expect(c.getSnapshot().selectedIds).toEqual([1]);
    expect(c.getSnapshot().perPage).toBe(5);
    expect(ctx.store.keys()).toEqual([]);
    c.destroy();
  });

  it("construction subscribes nothing and the last unsubscribe releases every observer", async () => {
    const ctx = makeCtx();
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    const c = createInfiniteListController(ctx, "posts", {});
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(getList).not.toHaveBeenCalled();
    const off1 = attach(c);
    const off2 = attach(c);
    await settled(c);
    expect(observerCount(ctx.queryClient)).toBeGreaterThan(0);
    off1();
    expect(observerCount(ctx.queryClient)).toBeGreaterThan(0);
    off2();
    expect(observerCount(ctx.queryClient)).toBe(0);
    // Re-attach rebuilds from current params and works again.
    c.setPage(2);
    attach(c);
    await vi.waitFor(() => expect(ids(c)).toEqual(range(11, 20)));
    c.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
  });

  it("destroy stops further state updates", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    const snap = c.getSnapshot();
    c.destroy();
    c.setPage(2);
    c.toggleItem(1);
    await c.fetchNextPage();
    expect(c.getSnapshot()).toBe(snap);
  });

  it("a cached getList failure with the same params is not announced beside a working infinite list", async () => {
    const ctx = makeCtx();
    const getList = vi
      .spyOn(ctx.dataProvider, "getList")
      .mockRejectedValueOnce(new Error("posts list is down"));
    // Pinned, so a changed default cannot move the controller off this entry.
    const params = {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "id", order: "ASC" } as const,
      filter: {},
    };
    // A plain posts list failed and left its error in the cache.
    const failed = getListOptions(ctx, "posts", params);
    await ctx.queryClient
      .fetchQuery({ ...failed, retry: false })
      .catch(() => {});
    expect(ctx.queryClient.getQueryState(failed.queryKey)?.status).toBe(
      "error",
    );
    getList.mockRestore();
    const c = createInfiniteListController(ctx, "posts", {
      perPage: 10,
      sort: params.sort,
    });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().error).toBeNull();
    expect(ids(c)).toEqual(range(1, 10));
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("selectAll announces a provider failure once and keeps the selection", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    c.select([3]);
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValueOnce(
      new Error("boom"),
    );
    await c.selectAll({ limit: 10 });
    const errors = ctx.notifications
      .getSnapshot()
      .filter((n) => n.type === "error");
    expect(errors.map((n) => n.message)).toEqual(["boom"]);
    expect(c.getSnapshot().selectedIds).toEqual([3]);
    c.destroy();
  });

  it("a fetch in the other direction waits for the running one instead of cancelling it", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    c.setPage(2);
    await vi.waitFor(() => expect(ids(c)).toEqual(range(11, 20)));
    await settled(c);
    const getList = slowProvider(ctx, [40]);
    const next = c.fetchNextPage();
    const previous = c.fetchPreviousPage();
    await Promise.all([next, previous]);
    expect(ids(c)).toEqual(range(1, 25));
    expect(getList.mock.calls.map(([, params]) => params?.pagination)).toEqual([
      { page: 3, perPage: 10 },
      { page: 1, perPage: 10 },
    ]);
    c.destroy();
  });

  it("refetch during fetchNextPage and fetchNextPage during refetch each load once", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    const getList = slowProvider(ctx, [40]);
    const next = c.fetchNextPage();
    c.refetch();
    await next;
    await settled(c);
    expect(ids(c)).toEqual(range(1, 20));
    getList.mockClear();
    c.refetch();
    const appended = c.fetchNextPage();
    await appended;
    await settled(c);
    expect(ids(c)).toEqual(range(1, 25));
    c.destroy();
  });

  it("a param change forgets the old query's running fetch", async () => {
    const ctx = makeCtx();
    const c = createInfiniteListController(ctx, "posts", { perPage: 2 });
    attach(c);
    await settled(c);
    const getList = slowProvider(ctx, [80, 5]);
    const stale = c.fetchNextPage();
    c.setFilters({ views: 0 });
    await settled(c);
    expect(ids(c)).toEqual([1, 6]);
    await c.fetchNextPage();
    expect(ids(c)).toEqual([1, 6, 11, 16]);
    expect(getList.mock.calls.at(-1)?.[1]).toMatchObject({
      pagination: { page: 2, perPage: 2 },
      filter: { views: 0 },
    });
    await stale;
    c.destroy();
  });

  it("a stale cached getList entry cannot move the list off the page that was asked for", async () => {
    const ctx = makeCtx();
    const params = {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "id", order: "ASC" } as const,
      filter: {},
    };
    // A plain List cached page 1 when the resource held 10 rows.
    ctx.queryClient.setQueryData(
      getListOptions(ctx, "posts", params).queryKey,
      {
        data: rows.slice(0, 10),
        total: 10,
      },
    );
    const c = createInfiniteListController(ctx, "posts", {
      perPage: 10,
      sort: params.sort,
    });
    attach(c);
    await settled(c);
    c.setPage(2);
    await vi.waitFor(() => expect(ids(c)).toEqual(range(11, 20)));
    await settled(c);
    expect(c.getSnapshot().page).toBe(2);
    expect(ids(c)).toEqual(range(11, 20));
    c.destroy();
  });
});
