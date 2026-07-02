import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import { createListController } from "./list-controller";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
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

describe("createListController", () => {
  beforeEach(() => vi.useRealTimers());

  it("fetches page 1 with defaults and exposes data/total", async () => {
    const c = createListController(makeCtx(), "posts", {});
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
    await settled(c);
    c.setPage(2);
    c.setSort({ field: "title", order: "ASC" });
    expect(c.getSnapshot().page).toBe(1);
    expect(c.getSnapshot().sort).toEqual([{ field: "title", order: "ASC" }]);
    c.setSort({ field: "title" } as never); // same field, no explicit order -> toggle
    expect(c.getSnapshot().sort).toEqual([{ field: "title", order: "DESC" }]);
    c.destroy();
  });

  it("multi-sort: array replaces wholesale and reaches the provider", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createListController(ctx, "posts", {});
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
    await settled(c1);
    c1.toggleItem(1);
    c1.toggleItem(2);
    c1.destroy();
    const c2 = createListController(ctx, "posts", {});
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

  it("params persist to the KV store and rehydrate", async () => {
    const ctx = makeCtx();
    const c1 = createListController(ctx, "posts", {});
    await settled(c1);
    c1.setPerPage(5);
    c1.setSort({ field: "title", order: "DESC" });
    c1.destroy();
    const c2 = createListController(ctx, "posts", {});
    expect(c2.getSnapshot().perPage).toBe(5);
    expect(c2.getSnapshot().sort).toEqual([{ field: "title", order: "DESC" }]);
    c2.destroy();
  });

  it("destroy unsubscribes the query observer (no further state updates)", async () => {
    const ctx = makeCtx();
    const c = createListController(ctx, "posts", {});
    await settled(c);
    const snap = c.getSnapshot();
    c.destroy();
    c.setPage(2);
    expect(c.getSnapshot()).toBe(snap);
  });

  // --- implementer-added cases (brief allows additions) ---

  it("setPerPage resets page to 1", async () => {
    const c = createListController(makeCtx(), "posts", {});
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
    await settled(c);
    c.showFilter("title", "abc");
    expect(c.getSnapshot().filter).toEqual({ title: "abc" });
    expect(c.getSnapshot().displayedFilters).toEqual({ title: true });
    c.hideFilter("title");
    expect(c.getSnapshot().filter).toEqual({});
    expect(c.getSnapshot().displayedFilters).toEqual({});
    c.destroy();
  });

  it("storeKey: false keeps params and selection out of the KV store", async () => {
    const ctx = makeCtx();
    const c = createListController(ctx, "posts", { storeKey: false });
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
    await settled(c);
    expect(c.getSnapshot().filter).toEqual({ views: 0 });
    expect(spy.mock.calls.at(-1)?.[1]?.filter).toEqual({ views: 0 });
    c.destroy();
  });

  it("enabled: false never fetches", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createListController(ctx, "posts", { enabled: false });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(spy).not.toHaveBeenCalled();
    expect(c.getSnapshot().isPending).toBe(true);
    c.destroy();
  });

  it("select replaces the selection; unselectAll clears it", async () => {
    const c = createListController(makeCtx(), "posts", {});
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
    await settled(c1);
    await settled(c2);
    c1.select([7]);
    expect(c2.getSnapshot().selectedIds).toEqual([7]);
    c1.destroy();
    c2.destroy();
  });
});
