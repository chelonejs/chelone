import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import { createListController } from "./list-controller";

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
const settled = async (c: { getSnapshot: () => { isPending: boolean } }) =>
  vi.waitFor(() => expect(c.getSnapshot().isPending).toBe(false));

/**
 * Post-4R lifecycle: construction is INERT — acquisition happens on the FIRST
 * subscriber. Vanilla tests attach explicitly, mirroring real vanilla usage.
 */
const attach = (c: { subscribe: (cb: () => void) => () => void }) =>
  c.subscribe(() => {});

/** Live QueryObserver subscriptions across the whole cache. */
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);

describe("createListController", () => {
  beforeEach(() => vi.useRealTimers());

  it("fetches page 1 with defaults and exposes data/total", async () => {
    const c = createListController(makeCtx(), "posts", {});
    attach(c);
    await settled(c);
    const s = c.getSnapshot();
    expect(s.data?.length).toBe(10);
    expect(s.total).toBe(25);
    expect(s.page).toBe(1);
    expect(s.hasNextPage).toBe(true);
    expect(s.hasPreviousPage).toBe(false);
    c.destroy();
  });

  it("setSort toggles order on the same field and resets page", async () => {
    const c = createListController(makeCtx(), "posts", {});
    attach(c);
    await settled(c);
    c.setPage(2);
    c.setSort({ field: "title", order: "ASC" });
    expect(c.getSnapshot().page).toBe(1);
    expect(c.getSnapshot().sort).toEqual([{ field: "title", order: "ASC" }]);
    // Wire-shaped on purpose: a sort off the wire can carry no `order`.
    c.setSort(JSON.parse('{"field":"title"}')); // no order -> toggle
    expect(c.getSnapshot().sort).toEqual([{ field: "title", order: "DESC" }]);
    c.destroy();
  });

  it("multi-sort: array replaces wholesale and reaches the provider", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    c.setSort([
      { field: "views", order: "ASC" },
      { field: "title", order: "DESC" },
    ]);
    await settled(c);
    const lastCall = spy.mock.calls.at(-1)?.[1];
    expect(lastCall?.sort).toEqual([
      { field: "views", order: "ASC" },
      { field: "title", order: "DESC" },
    ]);
    c.destroy();
  });

  it("setFilters strips empties, resets page, keeps displayedFilters when undefined; never mutates previous filter", async () => {
    const c = createListController(makeCtx(), "posts", {});
    attach(c);
    await settled(c);
    c.showFilter("title", undefined);
    const before = c.getSnapshot().filter;
    c.setFilters({ title: "t0", views: "" });
    expect(c.getSnapshot().filter).toEqual({ title: "t0" });
    expect(before).toEqual({}); // untouched
    expect(c.getSnapshot().displayedFilters).toEqual({ title: true });
    c.destroy();
  });

  it("permanent filter merges over user filter for the fetch", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createListController(ctx, "posts", { filter: { views: 0 } });
    attach(c);
    await settled(c);
    c.setFilters({ views: 3, title: "x" });
    await settled(c);
    expect(spy.mock.calls.at(-1)?.[1]?.filter).toEqual({
      title: "x",
      views: 0,
    });
    c.destroy();
  });

  it("out-of-range page resets to last page when data shrinks", async () => {
    const ctx = makeCtx();
    const c = createListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    c.setPage(3); // rows 21-25
    await settled(c);
    await ctx.dataProvider.deleteMany("posts", { ids: [21, 22, 23, 24, 25] });
    c.refetch();
    await vi.waitFor(() => expect(c.getSnapshot().page).toBe(2));
    c.destroy();
  });

  it("selection persists in the KV store across controller instances and selectAll caps + warns", async () => {
    const ctx = makeCtx();
    const c1 = createListController(ctx, "posts", {});
    attach(c1);
    await settled(c1);
    c1.toggleItem(1);
    c1.toggleItem(2);
    c1.destroy();
    const c2 = createListController(ctx, "posts", {});
    attach(c2);
    await settled(c2);
    expect(c2.getSnapshot().selectedIds).toEqual([1, 2]);
    await c2.selectAll({ limit: 10 });
    expect(c2.getSnapshot().selectedIds.length).toBe(10);
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "chelone.message.select_all_limit_reached"),
    ).toBe(true);
    c2.destroy();
  });

  it("debounced setFilters collapses rapid calls and is cancelled by destroy", async () => {
    vi.useFakeTimers();
    const ctx = makeCtx();
    const c = createListController(ctx, "posts", { debounceMs: 300 });
    c.setFilters({ title: "a" }, undefined, true);
    c.setFilters({ title: "ab" }, undefined, true);
    vi.advanceTimersByTime(300);
    expect(c.getSnapshot().filter).toEqual({ title: "ab" });
    c.setFilters({ title: "abc" }, undefined, true);
    c.destroy();
    vi.advanceTimersByTime(1000); // no post-destroy dispatch, no throw
    expect(c.getSnapshot().filter).toEqual({ title: "ab" });
    vi.useRealTimers();
  });

  it("exposes defaultPerPage from the perPage option, else 10", () => {
    const own = createListController(makeCtx(), "posts", { perPage: 25 });
    const fallback = createListController(makeCtx(), "posts", {});
    expect(own.defaultPerPage).toBe(25);
    expect(fallback.defaultPerPage).toBe(10);
    own.destroy();
    fallback.destroy();
  });

  it("params persist to the KV store and rehydrate", async () => {
    const ctx = makeCtx();
    const c1 = createListController(ctx, "posts", {});
    attach(c1);
    await settled(c1);
    c1.setPerPage(5);
    c1.setSort({ field: "title", order: "DESC" });
    c1.destroy();
    // c2 stays DETACHED — inert construction must still read persisted params.
    const c2 = createListController(ctx, "posts", {});
    expect(c2.getSnapshot().perPage).toBe(5);
    expect(c2.getSnapshot().sort).toEqual([{ field: "title", order: "DESC" }]);
    c2.destroy();
  });

  it("destroy unsubscribes the query observer (no further state updates)", async () => {
    const ctx = makeCtx();
    const c = createListController(ctx, "posts", {});
    attach(c);
    await settled(c);
    const snap = c.getSnapshot();
    c.destroy();
    c.setPage(2);
    expect(c.getSnapshot()).toBe(snap);
  });

  // --- implementer-added cases (brief allows additions) ---

  it("setPerPage resets page to 1", async () => {
    const c = createListController(makeCtx(), "posts", {});
    attach(c);
    await settled(c);
    c.setPage(2);
    c.setPerPage(20);
    const s = c.getSnapshot();
    expect(s.page).toBe(1);
    expect(s.perPage).toBe(20);
    c.destroy();
  });

  it("hideFilter removes the filter value and its displayed flag", async () => {
    const c = createListController(makeCtx(), "posts", {});
    attach(c);
    await settled(c);
    c.showFilter("title", "abc");
    expect(c.getSnapshot().filter).toEqual({ title: "abc" });
    expect(c.getSnapshot().displayedFilters).toEqual({ title: true });
    c.hideFilter("title");
    expect(c.getSnapshot().filter).toEqual({});
    expect(c.getSnapshot().displayedFilters).toEqual({});
    c.destroy();
  });

  it("hideFilter cancels a pending debounced setFilters", () => {
    vi.useFakeTimers();
    const c = createListController(makeCtx(), "posts", { debounceMs: 300 });
    c.showFilter("title");
    c.setFilters({ title: "abc" }, undefined, true);
    c.hideFilter("title");
    vi.advanceTimersByTime(1000);
    expect(c.getSnapshot().filter).toEqual({});
    expect(c.getSnapshot().displayedFilters).toEqual({});
    vi.useRealTimers();
    c.destroy();
  });

  it("hideFilter applies the pending debounced edits to the other filters", () => {
    vi.useFakeTimers();
    const c = createListController(makeCtx(), "posts", { debounceMs: 300 });
    c.showFilter("title");
    c.showFilter("views");
    c.setFilters({ title: "t", views: "3" }, undefined, true);
    c.hideFilter("title");
    expect(c.getSnapshot().filter).toEqual({ views: "3" });
    expect(c.getSnapshot().displayedFilters).toEqual({ views: true });
    vi.advanceTimersByTime(1000);
    expect(c.getSnapshot().filter).toEqual({ views: "3" });
    vi.useRealTimers();
    c.destroy();
  });

  it("hideFilter removes a dotted source from a nested filter, keeping its siblings", () => {
    const c = createListController(makeCtx(), "posts", {});
    c.setFilters(
      { author: { name: "x", id: 1 }, title: "t" },
      { "author.name": true },
    );
    c.hideFilter("author.name");
    expect(c.getSnapshot().filter).toEqual({ author: { id: 1 }, title: "t" });
    expect(c.getSnapshot().displayedFilters).toEqual({});
    c.destroy();
  });

  it("hideFilter drops a parent object left empty by a dotted source", () => {
    const c = createListController(makeCtx(), "posts", {});
    c.setFilters({ author: { name: "x" } }, { "author.name": true });
    c.hideFilter("author.name");
    expect(c.getSnapshot().filter).toEqual({});
    c.destroy();
  });

  it("storeKey: false keeps params and selection out of the KV store", async () => {
    const ctx = makeCtx();
    const c = createListController(ctx, "posts", { storeKey: false });
    attach(c);
    await settled(c);
    c.setPerPage(5);
    c.toggleItem(1);
    expect(c.getSnapshot().selectedIds).toEqual([1]);
    expect(ctx.store.keys()).toEqual([]);
    c.destroy();
  });

  it("filterDefaultValues seed the filter when nothing is persisted", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createListController(ctx, "posts", {
      filterDefaultValues: { views: 0 },
    });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().filter).toEqual({ views: 0 });
    expect(spy.mock.calls.at(-1)?.[1]?.filter).toEqual({ views: 0 });
    c.destroy();
  });

  it("enabled: false never fetches", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createListController(ctx, "posts", { enabled: false });
    attach(c); // even ATTACHED, enabled: false must not fetch
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(spy).not.toHaveBeenCalled();
    expect(c.getSnapshot().isPending).toBe(true);
    c.destroy();
  });

  it("select replaces the selection; unselectAll clears it", async () => {
    const c = createListController(makeCtx(), "posts", {});
    attach(c);
    await settled(c);
    c.select([3, 4, 5]);
    expect(c.getSnapshot().selectedIds).toEqual([3, 4, 5]);
    c.toggleItem(4);
    expect(c.getSnapshot().selectedIds).toEqual([3, 5]);
    c.unselectAll();
    expect(c.getSnapshot().selectedIds).toEqual([]);
    c.destroy();
  });

  it("query error notifies once with the error message as key and String(error) arg", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValue(new Error("boom"));
    const c = createListController(ctx, "posts", {});
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    const errors = ctx.notifications
      .getSnapshot()
      .filter((n) => n.type === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("boom");
    expect(errors[0]?.messageArgs).toEqual({ _: "Error: boom" });
    c.destroy();
  });

  it("query error with an empty message falls back to chelone.notification.http_error", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValue(new Error(""));
    const c = createListController(ctx, "posts", {});
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "chelone.notification.http_error"),
    ).toBe(true);
    c.destroy();
  });

  it("cross-instance selection syncs between two live controllers", async () => {
    const ctx = makeCtx();
    const c1 = createListController(ctx, "posts", {});
    const c2 = createListController(ctx, "posts", {});
    attach(c1);
    attach(c2);
    await settled(c1);
    await settled(c2);
    c1.select([7]);
    expect(c2.getSnapshot().selectedIds).toEqual([7]);
    c1.destroy();
    c2.destroy();
  });

  // --- Task 4R: subscription-driven acquisition (the zombie-leak fix) ---

  describe("setParams", () => {
    it("setParams replaces filter, sort and perPage with a single getList call", async () => {
      const ctx = makeCtx();
      const spy = vi.spyOn(ctx.dataProvider, "getList");
      const c = createListController(ctx, "posts", {});
      attach(c);
      await settled(c);
      const before = spy.mock.calls.length;
      c.setParams({
        filter: { title: "t0" },
        sort: { field: "views", order: "DESC" },
        perPage: 5,
      });
      await settled(c);
      expect(spy.mock.calls.length).toBe(before + 1);
      expect(spy.mock.calls.at(-1)?.[1]).toMatchObject({
        pagination: { page: 1, perPage: 5 },
        sort: { field: "views", order: "DESC" },
        filter: { title: "t0" },
      });
      c.destroy();
    });

    it("setParams replaces the sort wholesale instead of toggling the sorted field", () => {
      const c = createListController(makeCtx(), "posts", {
        sort: { field: "title", order: "ASC" },
      });
      c.setParams({ sort: { field: "title", order: "ASC" } });
      expect(c.getSnapshot().sort).toEqual([{ field: "title", order: "ASC" }]);
      c.destroy();
    });

    it("setParams resets page to 1 unless the patch sets page", () => {
      const c = createListController(makeCtx(), "posts", {});
      c.setPage(3);
      c.setParams({ perPage: 5 });
      expect(c.getSnapshot().page).toBe(1);
      c.setPage(3);
      c.setParams({ filter: { title: "t" }, page: 2 });
      expect(c.getSnapshot().page).toBe(2);
      c.setPage(3);
      c.setParams({ sort: { field: "title", order: "ASC" } });
      expect(c.getSnapshot().page).toBe(1);
      c.setPage(3);
      c.setParams({ filter: {} });
      expect(c.getSnapshot().page).toBe(1);
      c.destroy();
    });

    it("setParams with only displayedFilters keeps the filter and the page", () => {
      const c = createListController(makeCtx(), "posts", {});
      c.setFilters({ title: "t" }, { title: true });
      c.setPage(2);
      c.setParams({ displayedFilters: { views: true } });
      const s = c.getSnapshot();
      expect(s.displayedFilters).toEqual({ views: true });
      expect(s.filter).toEqual({ title: "t" });
      expect(s.page).toBe(2);
      c.destroy();
    });

    it("setParams keeps displayedFilters when the patch omits it", () => {
      const c = createListController(makeCtx(), "posts", {});
      c.setFilters({ title: "t" }, { title: true });
      c.setParams({ filter: { views: 1 } });
      expect(c.getSnapshot().displayedFilters).toEqual({ title: true });
      c.destroy();
    });

    it("setParams strips empty filter values and keeps an array sort in order", () => {
      const c = createListController(makeCtx(), "posts", {});
      c.setParams({
        filter: { title: "t0", views: "", id: null },
        sort: [
          { field: "views", order: "ASC" },
          { field: "title", order: "DESC" },
        ],
      });
      const s = c.getSnapshot();
      expect(s.filter).toEqual({ title: "t0" });
      expect(s.sort).toEqual([
        { field: "views", order: "ASC" },
        { field: "title", order: "DESC" },
      ]);
      c.destroy();
    });

    it("setParams writes the listParams store key once", () => {
      const ctx = makeCtx();
      const writes = vi.spyOn(ctx.store, "setItem");
      const c = createListController(ctx, "posts", {});
      c.setParams({
        filter: { title: "t0" },
        sort: { field: "views", order: "DESC" },
        perPage: 5,
      });
      expect(
        writes.mock.calls.filter(([key]) => key === "posts.listParams"),
      ).toHaveLength(1);
      expect(ctx.store.getItem("posts.listParams")).toMatchObject({
        perPage: 5,
        page: 1,
        filter: { title: "t0" },
      });
      c.destroy();
    });

    it("setParams moves filter, sort and perPage in one state change", async () => {
      const c = createListController(makeCtx(), "posts", {});
      const seen: Array<{ filter: unknown; sort: unknown; perPage: number }> =
        [];
      c.subscribe(() => {
        const { filter, sort, perPage } = c.getSnapshot();
        seen.push({ filter, sort, perPage });
      });
      await settled(c);
      seen.length = 0;
      c.setParams({
        filter: { title: "t0" },
        sort: { field: "views", order: "DESC" },
        perPage: 5,
      });
      await settled(c);
      // Later notifications are the fetch lifecycle; none shows a half-applied patch.
      const distinct = new Set(seen.map((s) => JSON.stringify(s)));
      expect(distinct.size).toBe(1);
      expect(seen[0]).toEqual({
        filter: { title: "t0" },
        sort: [{ field: "views", order: "DESC" }],
        perPage: 5,
      });
      c.destroy();
    });

    it("setParams is not debounced", () => {
      vi.useFakeTimers();
      const c = createListController(makeCtx(), "posts", { debounceMs: 300 });
      c.setParams({ filter: { title: "t0" } });
      expect(c.getSnapshot().filter).toEqual({ title: "t0" });
      vi.useRealTimers();
      c.destroy();
    });

    it("setParams with a filter cancels a pending debounced setFilters", () => {
      vi.useFakeTimers();
      const c = createListController(makeCtx(), "posts", { debounceMs: 300 });
      c.setFilters({ title: "abc" }, undefined, true);
      c.setParams({ filter: { title: "x" } });
      vi.advanceTimersByTime(1000);
      expect(c.getSnapshot().filter).toEqual({ title: "x" });
      vi.useRealTimers();
      c.destroy();
    });

    it("setParams with an empty patch does not write or notify", () => {
      const ctx = makeCtx();
      const writes = vi.spyOn(ctx.store, "setItem");
      const c = createListController(ctx, "posts", {});
      const listener = vi.fn();
      c.subscribe(listener);
      listener.mockClear();
      writes.mockClear();
      c.setParams({});
      expect(writes).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      c.destroy();
    });

    it("setParams after destroy does nothing", () => {
      const ctx = makeCtx();
      const c = createListController(ctx, "posts", {});
      c.destroy();
      c.setParams({ filter: { title: "t0" }, perPage: 5 });
      expect(c.getSnapshot().filter).toEqual({});
      expect(c.getSnapshot().perPage).toBe(10);
      expect(ctx.store.getItem("posts.listParams")).toBeUndefined();
    });
  });

  describe("lazy acquisition lifecycle", () => {
    it("construction is INERT: no fetch, no observers, no KV subscriptions", async () => {
      const ctx = makeCtx();
      const spy = vi.spyOn(ctx.dataProvider, "getList");
      const c = createListController(ctx, "posts", {});
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(spy).not.toHaveBeenCalled();
      expect(observerCount(ctx.queryClient)).toBe(0);
      // A discarded (never-subscribed) controller needs no destroy to be leak-free,
      // but destroy must still be safe on it.
      c.destroy();
      expect(observerCount(ctx.queryClient)).toBe(0);
    });

    it("acquires on first subscribe, releases on last unsubscribe", async () => {
      const ctx = makeCtx();
      const c = createListController(ctx, "posts", {});
      const detach = attach(c);
      await settled(c);
      expect(c.getSnapshot().data?.length).toBe(10);
      expect(observerCount(ctx.queryClient)).toBe(1);
      detach();
      expect(observerCount(ctx.queryClient)).toBe(0);
      c.destroy();
    });

    it("re-attach rebuilds query options from CURRENT state (params changed while detached)", async () => {
      const ctx = makeCtx();
      const spy = vi.spyOn(ctx.dataProvider, "getList");
      const c = createListController(ctx, "posts", {});
      const detach = attach(c);
      await settled(c);
      detach();
      const callsAfterDetach = spy.mock.calls.length;
      c.setPage(3); // actions work detached: state + KV persistence, no fetch
      expect(c.getSnapshot().page).toBe(3);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(spy.mock.calls.length).toBe(callsAfterDetach);
      attach(c);
      await vi.waitFor(() => expect(c.getSnapshot().data?.[0]?.id).toBe(21));
      const lastPagination = spy.mock.calls.at(-1)?.[1]?.pagination;
      expect(lastPagination).toEqual({ page: 3, perPage: 10 });
      c.destroy();
    });

    it("refetch while detached is a no-op", async () => {
      const ctx = makeCtx();
      const spy = vi.spyOn(ctx.dataProvider, "getList");
      const c = createListController(ctx, "posts", {});
      const detach = attach(c);
      await settled(c);
      detach();
      const calls = spy.mock.calls.length;
      c.refetch();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(spy.mock.calls.length).toBe(calls);
      c.destroy();
    });

    it("actions while detached persist params to the KV store", async () => {
      const ctx = makeCtx();
      const c = createListController(ctx, "posts", {});
      c.setPerPage(5); // never attached at all
      expect(c.getSnapshot().perPage).toBe(5);
      expect(
        ctx.store.getItem<{ perPage: number }>("posts.listParams")?.perPage,
      ).toBe(5);
      c.destroy();
    });

    it("selection changes while detached mirror into local state AND the KV store", () => {
      const ctx = makeCtx();
      const c = createListController(ctx, "posts", {});
      c.toggleItem(1);
      c.select([1, 2]);
      expect(c.getSnapshot().selectedIds).toEqual([1, 2]);
      expect(ctx.store.getItem<number[]>("posts.selectedIds")).toEqual([1, 2]);
      c.destroy();
    });

    it("selection re-syncs from the KV store on attach (moved while detached)", async () => {
      const ctx = makeCtx();
      const c = createListController(ctx, "posts", {});
      // Another instance (or tab) moves the selection while c is detached.
      ctx.store.setItem("posts.selectedIds", [9]);
      attach(c);
      expect(c.getSnapshot().selectedIds).toEqual([9]);
      await settled(c);
      c.destroy();
    });

    it("selectAll works detached (direct fetchQuery, no observer needed)", async () => {
      const ctx = makeCtx();
      const c = createListController(ctx, "posts", {});
      await c.selectAll({ limit: 5 });
      expect(c.getSnapshot().selectedIds.length).toBe(5);
      c.destroy();
    });

    it("destroy while attached releases the observer and the KV subscription", async () => {
      const ctx = makeCtx();
      const c = createListController(ctx, "posts", {});
      attach(c);
      await settled(c);
      expect(observerCount(ctx.queryClient)).toBe(1);
      c.destroy();
      expect(observerCount(ctx.queryClient)).toBe(0);
      // KV subscription is gone: external selection writes no longer reach state.
      ctx.store.setItem("posts.selectedIds", [4]);
      expect(c.getSnapshot().selectedIds).toEqual([]);
    });
  });
});
