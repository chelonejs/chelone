import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { getListOptions } from "../data/query-options";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import { createReferenceManyController } from "./reference-many-controller";

// `looseObject` on purpose: these tests filter on plain field names, and a
// strict record keys its filter by `FilterSourceKey` — `q` plus operator
// suffixes only. Filter-key typing is pinned in source-path.test-d.ts.
const resources = defineResources({
  comments: {
    schema: z.looseObject({
      id: z.number(),
      postId: z.number(),
      body: z.string(),
      score: z.number(),
    }),
  },
});

// 30 comments on post 1, 4 on post 2.
const rows = [
  ...Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    postId: 1,
    body: `c${String(i + 1).padStart(2, "0")}`,
    score: i % 3,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 101 + i,
    postId: 2,
    body: `d${i + 1}`,
    score: 0,
  })),
];

function makeCtx() {
  return {
    dataProvider: fakeDataProvider<typeof resources>({
      comments: structuredClone(rows),
    }),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    store: createStore(),
    notifications: createNotificationStore(),
  };
}
type Ctx = ReturnType<typeof makeCtx>;

/** Resolves once the first result has arrived. */
const settled = async (c: { getSnapshot: () => { isPending: boolean } }) =>
  vi.waitFor(() => expect(c.getSnapshot().isPending).toBe(false));
/** Resolves once no fetch is in flight; use it after an action that refetches. */
const idle = async (c: { getSnapshot: () => { isFetching: boolean } }) =>
  vi.waitFor(() => expect(c.getSnapshot().isFetching).toBe(false));

/** Construction is inert: tests attach explicitly, as vanilla consumers do. */
const attach = (c: { subscribe: (cb: () => void) => () => void }) =>
  c.subscribe(() => {});

/** Live observers in the cache. Each test builds its own client, so only the controller's queries are counted. */
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);

function spies(ctx: Ctx) {
  return {
    ref: vi.spyOn(ctx.dataProvider, "getManyReference"),
    list: vi.spyOn(ctx.dataProvider, "getList"),
  };
}

describe("createReferenceManyController", () => {
  beforeEach(() => vi.useRealTimers());

  it("fetches the first page of rows whose target equals the id through getManyReference and never getList", async () => {
    const ctx = makeCtx();
    const { ref, list } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    attach(c);
    await settled(c);
    const s = c.getSnapshot();
    expect(s.data?.length).toBe(25);
    expect(s.data?.every((row) => row.postId === 1)).toBe(true);
    expect(s.total).toBe(30);
    expect(s.page).toBe(1);
    expect(s.perPage).toBe(25);
    expect(s.sort).toEqual([{ field: "id", order: "ASC" }]);
    expect(s.hasNextPage).toBe(true);
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledWith("comments", {
      target: "postId",
      id: 1,
      pagination: { page: 1, perPage: 25 },
      sort: { field: "id", order: "ASC" },
      filter: {},
    });
    expect(list).not.toHaveBeenCalled();
    c.destroy();
  });

  it("perPage, sort and the permanent filter reach the provider and the permanent filter wins over a user filter", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      perPage: 5,
      sort: { field: "body", order: "DESC" },
      filter: { score: 1 },
      filterDefaultValues: { score: 2 },
    });
    attach(c);
    await settled(c);
    expect(ref).toHaveBeenLastCalledWith("comments", {
      target: "postId",
      id: 1,
      pagination: { page: 1, perPage: 5 },
      sort: { field: "body", order: "DESC" },
      filter: { score: 1 },
    });
    // The user filter keeps its own value (score 2); only the request is overridden (score 1).
    expect(c.getSnapshot().filter).toEqual({ score: 2 });
    expect(c.getSnapshot().data?.every((row) => row.score === 1)).toBe(true);
    expect(c.getSnapshot().data?.map((row) => row.body)).toEqual([
      "c29",
      "c26",
      "c23",
      "c20",
      "c17",
    ]);
    c.destroy();
  });

  it("setPage fetches that page, setSort restarts from page 1 and setFilters strips empty values", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      perPage: 10,
    });
    attach(c);
    await settled(c);
    c.setPage(2);
    await vi.waitFor(() => expect(c.getSnapshot().data?.[0]?.id).toBe(11));
    expect(ref).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ pagination: { page: 2, perPage: 10 } }),
    );
    c.setSort({ field: "id", order: "ASC" });
    // same single field: toggles ASC -> DESC and restarts from page 1
    expect(c.getSnapshot().page).toBe(1);
    await vi.waitFor(() => expect(c.getSnapshot().data?.[0]?.id).toBe(30));
    c.setFilters({ score: 1, body: "", other: null });
    expect(c.getSnapshot().filter).toEqual({ score: 1 });
    expect(c.getSnapshot().page).toBe(1);
    await vi.waitFor(() =>
      expect(c.getSnapshot().data?.every((row) => row.score === 1)).toBe(true),
    );
    expect(c.getSnapshot().total).toBe(10);
    c.destroy();
  });

  it("setParams applies filter, sort and perPage with one getManyReference call", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    attach(c);
    await settled(c);
    ref.mockClear();
    c.setParams({
      filter: { score: 0 },
      sort: { field: "body", order: "DESC" },
      perPage: 3,
    });
    await idle(c);
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledWith("comments", {
      target: "postId",
      id: 1,
      pagination: { page: 1, perPage: 3 },
      sort: { field: "body", order: "DESC" },
      filter: { score: 0 },
    });
    expect(c.getSnapshot().data?.map((row) => row.body)).toEqual([
      "c28",
      "c25",
      "c22",
    ]);
    c.destroy();
  });

  it("a page past the last resets to the last page once total is known", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    ctx.store.setItem("comments.postId.1.listParams", {
      page: 9,
      perPage: 10,
      sort: [{ field: "id", order: "ASC" }],
      filter: {},
      displayedFilters: {},
    });
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().page).toBe(3));
    await vi.waitFor(() => expect(c.getSnapshot().data?.length).toBe(10));
    expect(c.getSnapshot().total).toBe(30);
    expect(ref).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ pagination: { page: 3, perPage: 10 } }),
    );
    c.setPage(0);
    expect(c.getSnapshot().page).toBe(1);
    c.destroy();
  });

  it("a null or undefined id fetches nothing and reports an empty settled list", async () => {
    for (const id of [null, undefined]) {
      const ctx = makeCtx();
      const { ref } = spies(ctx);
      const c = createReferenceManyController(ctx, "comments", {
        target: "postId",
        id,
      });
      expect(c.getSnapshot()).toMatchObject({
        data: [],
        total: 0,
        isPending: false,
      });
      attach(c);
      c.setPage(2);
      expect(c.getSnapshot()).toMatchObject({
        data: [],
        total: 0,
        isPending: false,
        isFetching: false,
      });
      await c.selectAll();
      expect(ref).not.toHaveBeenCalled();
      c.destroy();
    }
  });

  it("an id of 0 is a real id and is fetched", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 0,
    });
    attach(c);
    await settled(c);
    expect(ref).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({ id: 0 }),
    );
    expect(c.getSnapshot()).toMatchObject({ data: [], total: 0 });
    c.destroy();
  });

  it("selection persists under the storeKey and two ids keep separate selections", async () => {
    const ctx = makeCtx();
    const one = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    const two = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 2,
    });
    attach(one);
    attach(two);
    one.select([1, 2]);
    one.toggleItem(3);
    two.select([101]);
    expect(one.getSnapshot().selectedIds).toEqual([1, 2, 3]);
    expect(two.getSnapshot().selectedIds).toEqual([101]);
    expect(ctx.store.getItem("comments.postId.1.selectedIds")).toEqual([
      1, 2, 3,
    ]);
    expect(ctx.store.getItem("comments.postId.2.selectedIds")).toEqual([101]);
    one.destroy();
    two.destroy();

    const again = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    expect(again.getSnapshot().selectedIds).toEqual([1, 2, 3]);
    again.unselectAll();
    expect(again.getSnapshot().selectedIds).toEqual([]);
    again.destroy();

    const custom = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      storeKey: "mine",
    });
    attach(custom);
    custom.setPage(2);
    expect(ctx.store.getItem("mine.listParams")).toMatchObject({ page: 2 });
    custom.select([7]);
    expect(ctx.store.getItem("mine.selectedIds")).toEqual([7]);
    // the default key is untouched by the custom one
    expect(ctx.store.getItem("comments.postId.1.selectedIds")).toEqual([]);
    custom.destroy();
  });

  it("selectAll selects across pages through getManyReference and warns at the limit", async () => {
    const ctx = makeCtx();
    const { ref, list } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      perPage: 5,
    });
    attach(c);
    await settled(c);
    await c.selectAll();
    expect(c.getSnapshot().selectedIds).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
    expect(ref).toHaveBeenLastCalledWith("comments", {
      target: "postId",
      id: 1,
      pagination: { page: 1, perPage: 250 },
      sort: { field: "id", order: "ASC" },
      filter: {},
    });
    expect(list).not.toHaveBeenCalled();
    expect(ctx.notifications.getSnapshot()).toEqual([]);

    // active filter and sort apply; the permanent filter would too
    c.setParams({ filter: { score: 1 }, sort: { field: "id", order: "DESC" } });
    await idle(c);
    await c.selectAll({ limit: 4 });
    expect(c.getSnapshot().selectedIds).toEqual([29, 26, 23, 20]);
    expect(ref).toHaveBeenLastCalledWith("comments", {
      target: "postId",
      id: 1,
      pagination: { page: 1, perPage: 4 },
      sort: { field: "id", order: "DESC" },
      filter: { score: 1 },
    });
    ctx.notifications.clear();

    c.setParams({ filter: {}, sort: { field: "id", order: "ASC" } });
    await idle(c);
    await c.selectAll({ limit: 12 });
    expect(c.getSnapshot().selectedIds).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    expect(ctx.notifications.getSnapshot()).toEqual([
      expect.objectContaining({
        message: "chelone.message.select_all_limit_reached",
        type: "warning",
        messageArgs: { max: 12 },
      }),
    ]);
    c.destroy();
  });

  it("storeKey false keeps params and selection out of the store", async () => {
    const ctx = makeCtx();
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      storeKey: false,
    });
    attach(c);
    await settled(c);
    c.setPage(2);
    c.select([4, 5]);
    expect(c.getSnapshot().page).toBe(2);
    expect(c.getSnapshot().selectedIds).toEqual([4, 5]);
    expect(ctx.store.getItem("comments.postId.1.listParams")).toBeUndefined();
    expect(ctx.store.getItem("comments.postId.1.selectedIds")).toBeUndefined();
    c.destroy();
  });

  it("a provider error notifies once and sets error", async () => {
    const ctx = makeCtx();
    const boom = new Error("comments are down");
    vi.spyOn(ctx.dataProvider, "getManyReference").mockRejectedValue(boom);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().error).toBe(boom);
    expect(ctx.notifications.getSnapshot()).toHaveLength(1);
    c.refetch();
    await idle(c);
    c.refetch();
    await idle(c);
    // the same error object across refetches is announced once
    expect(ctx.notifications.getSnapshot()).toHaveLength(1);
    expect(ctx.notifications.getSnapshot()[0]).toMatchObject({
      message: "comments are down",
      type: "error",
    });
    c.destroy();

    const anonymous = makeCtx();
    vi.spyOn(anonymous.dataProvider, "getManyReference").mockRejectedValue(
      "nope",
    );
    const d = createReferenceManyController(anonymous, "comments", {
      target: "postId",
      id: 1,
    });
    attach(d);
    await settled(d);
    expect(anonymous.notifications.getSnapshot()[0]).toMatchObject({
      message: "chelone.notification.http_error",
    });
    d.destroy();
  });

  it("construction subscribes nothing and the last unsubscribe releases every observer", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(ref).not.toHaveBeenCalled();
    const first = attach(c);
    const second = attach(c);
    await settled(c);
    // the data observer plus the inner params observer
    expect(observerCount(ctx.queryClient)).toBe(2);
    first();
    expect(observerCount(ctx.queryClient)).toBe(2);
    second();
    expect(observerCount(ctx.queryClient)).toBe(0);

    // re-attach rebuilds from current params
    c.setPage(2);
    const third = attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().data?.[0]?.id).toBe(26));
    third();
    expect(observerCount(ctx.queryClient)).toBe(0);
    c.destroy();
  });

  it("destroy while attached releases every observer and later actions do nothing", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    attach(c);
    await settled(c);
    c.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
    ref.mockClear();
    c.setPage(2);
    c.select([1]);
    await c.selectAll();
    expect(c.getSnapshot().page).toBe(1);
    expect(c.getSnapshot().selectedIds).toEqual([]);
    expect(ref).not.toHaveBeenCalled();
  });

  it("refetch fetches the current page again", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      perPage: 10,
    });
    c.refetch(); // detached: nothing to refetch
    expect(ref).not.toHaveBeenCalled();
    attach(c);
    await settled(c);
    c.setPage(2);
    await vi.waitFor(() => expect(c.getSnapshot().data?.[0]?.id).toBe(11));
    ref.mockClear();
    c.refetch();
    await vi.waitFor(() => expect(ref).toHaveBeenCalledTimes(1));
    expect(ref).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({ pagination: { page: 2, perPage: 10 } }),
    );
    c.destroy();
  });

  it("a cached getList failure with the same params is not announced beside a working reference list", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValue(
      new Error("comments list is down"),
    );
    // A plain comments list failed and left its error in the cache.
    await ctx.queryClient
      .fetchQuery({
        ...getListOptions(ctx, "comments", {
          pagination: { page: 1, perPage: 25 },
          sort: { field: "id", order: "ASC" },
          filter: {},
        }),
        retry: false,
      })
      .catch(() => {});
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
    });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().error).toBeNull();
    expect(c.getSnapshot().data).toHaveLength(25);
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("a debounced setFilters on a detached controller lands in the snapshot and in selectAll", async () => {
    const ctx = makeCtx();
    const { ref } = spies(ctx);
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      debounceMs: 20,
    });
    c.setFilters({ score: 1 }, undefined, true);
    expect(c.getSnapshot().filter).toEqual({});
    await vi.waitFor(() =>
      expect(c.getSnapshot().filter).toEqual({ score: 1 }),
    );
    await c.selectAll();
    expect(ref).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ filter: { score: 1 } }),
    );
    expect(c.getSnapshot().selectedIds).toHaveLength(10);
    c.destroy();
  });

  it("a pending debounced filter is dropped by a later setParams filter and by destroy", async () => {
    const ctx = makeCtx();
    const c = createReferenceManyController(ctx, "comments", {
      target: "postId",
      id: 1,
      debounceMs: 20,
    });
    c.setFilters({ score: 1 }, undefined, true);
    c.setParams({ filter: { score: 2 } });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(c.getSnapshot().filter).toEqual({ score: 2 });

    c.setFilters({ score: 0 }, undefined, true);
    c.destroy();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(c.getSnapshot().filter).toEqual({ score: 2 });
  });
});
