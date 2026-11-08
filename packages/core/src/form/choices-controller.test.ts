import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { choiceListsOf, createChoicesController } from "./choices-controller";

// `looseObject` on purpose: these tests filter on plain field names, and a
// strict record keys its filter by `FilterSourceKey` — `q` plus operator
// suffixes only. Filter-key typing is pinned in source-path.test-d.ts.
const resources = defineResources({
  posts: {
    schema: z.looseObject({
      id: z.number(),
      title: z.string(),
      isbn: z.string(),
      category: z.string(),
    }),
  },
});

const rows = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${String(i + 1).padStart(2, "0")}`,
  isbn: `isbn-${i + 1}`,
  category: i % 2 === 0 ? "tech" : "life",
}));

function makeCtx() {
  return {
    dataProvider: fakeDataProvider<typeof resources>({
      posts: structuredClone(rows),
    }),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    notifications: createNotificationStore(),
  };
}

const attach = (c: { subscribe: (cb: () => void) => () => void }) =>
  c.subscribe(() => {});

const settled = async (c: { getSnapshot: () => { isPending: boolean } }) =>
  vi.waitFor(() => expect(c.getSnapshot().isPending).toBe(false));

/** Live QueryObserver subscriptions across the whole cache. */
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);

describe("createChoicesController — lifecycle (4R)", () => {
  beforeEach(() => vi.useRealTimers());

  it("construction is INERT: no observers, no fetch, isPending seeded", () => {
    const ctx = makeCtx();
    const getListSpy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, { reference: "posts" });
    expect(getListSpy).not.toHaveBeenCalled();
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(c.getSnapshot().isPending).toBe(true);
    c.destroy();
  });

  it("first subscriber attaches the choices observer and fetches", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().availableChoices.length).toBe(25);
    expect(observerCount(ctx.queryClient)).toBeGreaterThan(0);
    c.destroy();
  });

  it("last unsubscribe releases the observers and clears the debounce timer", async () => {
    vi.useFakeTimers();
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts" });
    const un = attach(c);
    await vi.waitFor(() =>
      expect(observerCount(ctx.queryClient)).toBeGreaterThan(0),
    );
    c.setValue(1);
    await vi.waitFor(() =>
      expect(observerCount(ctx.queryClient)).toBeGreaterThan(1),
    );
    // arm a debounce timer that must be cleared on detach
    c.setFilters({ q: "abc" }, true);
    un();
    expect(observerCount(ctx.queryClient)).toBe(0);
    // if the timer survived detach, it would call applyFilters after 500ms;
    // detached that is a no-op, but the timer itself must be cleared.
    vi.advanceTimersByTime(1000);
    expect(observerCount(ctx.queryClient)).toBe(0);
    c.destroy();
    vi.useRealTimers();
  });

  it("re-attach after detach rebuilds from current state", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts", perPage: 5 });
    const un = attach(c);
    await settled(c);
    expect(c.getSnapshot().availableChoices.length).toBe(5);
    un();
    expect(observerCount(ctx.queryClient)).toBe(0);
    const un2 = attach(c);
    await settled(c);
    expect(c.getSnapshot().availableChoices.length).toBe(5);
    un2();
    c.destroy();
  });

  it("destroy is idempotent and blocks re-attach", () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts" });
    c.destroy();
    c.destroy();
    const un = c.subscribe(() => {});
    expect(observerCount(ctx.queryClient)).toBe(0);
    un();
  });
});

describe("createChoicesController — fetch params", () => {
  beforeEach(() => vi.useRealTimers());

  it("merges dynamic filters UNDER the permanent filter", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, {
      reference: "posts",
      filter: { category: "tech" },
    });
    attach(c);
    await settled(c);
    c.setFilters({ category: "life" });
    await settled(c);
    // permanent filter wins the merge -> only tech rows returned
    const last = spy.mock.calls.at(-1)?.[1];
    expect(last?.filter).toMatchObject({ category: "tech" });
    expect(
      c.getSnapshot().availableChoices.every((r) => r.category === "tech"),
    ).toBe(true);
    c.destroy();
  });

  it("setPage / setPerPage reach the provider; setSort resets page to 1", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, { reference: "posts", perPage: 5 });
    attach(c);
    await settled(c);
    c.setPage(3);
    await settled(c);
    expect(c.getSnapshot().page).toBe(3);
    c.setSort({ field: "title", order: "ASC" });
    await settled(c);
    expect(c.getSnapshot().page).toBe(1);
    const last = spy.mock.calls.at(-1)?.[1];
    expect(last?.pagination).toMatchObject({ page: 1, perPage: 5 });
    c.destroy();
  });

  it("uses the configured default sort and perPage (25)", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await settled(c);
    const first = spy.mock.calls[0]?.[1];
    expect(first?.pagination).toMatchObject({ page: 1, perPage: 25 });
    c.destroy();
  });
});

describe("createChoicesController — setFilters debounce", () => {
  beforeEach(() => vi.useFakeTimers());

  it("debounced setFilters waits the default 500ms then fetches", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    const before = spy.mock.calls.length;
    c.setFilters({ title: "t01" }, true);
    expect(spy.mock.calls.length).toBe(before); // not yet
    vi.advanceTimersByTime(499);
    expect(spy.mock.calls.length).toBe(before);
    vi.advanceTimersByTime(1);
    expect(c.getSnapshot().filter).toMatchObject({ title: "t01" });
    expect(spy.mock.calls.length).toBeGreaterThan(before);
    c.destroy();
    vi.useRealTimers();
  });

  it("a fresh debounced call cancels the pending one", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    const before = spy.mock.calls.length;
    c.setFilters({ title: "t01" }, true);
    vi.advanceTimersByTime(300);
    c.setFilters({ title: "t02" }, true);
    vi.advanceTimersByTime(300);
    expect(spy.mock.calls.length).toBe(before); // first was cancelled
    vi.advanceTimersByTime(200);
    expect(c.getSnapshot().filter).toMatchObject({ title: "t02" });
    c.destroy();
    vi.useRealTimers();
  });

  it("removeEmpty strips '', null, undefined from filters", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().isPending).toBe(false));
    c.setFilters({ title: "", category: "tech", note: null });
    expect(c.getSnapshot().filter).toEqual({ category: "tech" });
    c.destroy();
    vi.useRealTimers();
  });
});

describe("createChoicesController — selected resolution (id lookup)", () => {
  beforeEach(() => vi.useRealTimers());

  it("setValue with a scalar id resolves the selected record via getMany", async () => {
    const ctx = makeCtx();
    const getManySpy = vi.spyOn(ctx.dataProvider, "getMany");
    const c = createChoicesController(ctx, { reference: "posts", perPage: 5 });
    attach(c);
    await settled(c);
    c.setValue(20); // id NOT on page 1 (page = ids 1..5)
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(1),
    );
    expect(getManySpy).toHaveBeenCalled();
    expect(c.getSnapshot().selectedChoices[0]?.id).toBe(20);
    c.destroy();
  });

  it("prepends a missing selected record and bumps total by 1", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts", perPage: 5 });
    attach(c);
    await settled(c);
    const totalBefore = c.getSnapshot().total;
    c.setValue(20);
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(1),
    );
    const s = c.getSnapshot();
    expect(s.allChoices[0]?.id).toBe(20); // prepended
    expect(s.allChoices.length).toBe(6); // 5 page + 1 selected
    expect(s.total).toBe((totalBefore ?? 0) + 1);
    c.destroy();
  });

  it("does NOT prepend or bump when the selected record is already on the page", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts", perPage: 25 });
    attach(c);
    await settled(c);
    const totalBefore = c.getSnapshot().total;
    c.setValue(3); // on the page
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(1),
    );
    const s = c.getSnapshot();
    expect(s.allChoices.length).toBe(25); // no prepend
    expect(s.total).toBe(totalBefore);
    // deduped by id
    expect(s.allChoices.filter((r) => r.id === 3).length).toBe(1);
    c.destroy();
  });

  it("array value: multiple selected ids resolved, total unadjusted", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts", perPage: 5 });
    attach(c);
    await settled(c);
    const totalBefore = c.getSnapshot().total;
    c.setValue([18, 19, 20]);
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(3),
    );
    const s = c.getSnapshot();
    // all three prepended (none on page 1..5)
    expect(
      s.allChoices
        .slice(0, 3)
        .map((r) => r.id)
        .sort(),
    ).toEqual([18, 19, 20]);
    expect(s.total).toBe(totalBefore); // array mode: total NOT +1'd
    c.destroy();
  });

  it("empty / null value resolves no selected records and does not fetch", async () => {
    const ctx = makeCtx();
    const getManySpy = vi.spyOn(ctx.dataProvider, "getMany");
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await settled(c);
    c.setValue(null);
    c.setValue([]);
    await vi.waitFor(() => expect(c.getSnapshot().isPending).toBe(false));
    expect(getManySpy).not.toHaveBeenCalled();
    expect(c.getSnapshot().selectedChoices).toEqual([]);
    c.destroy();
  });
});

describe("createChoicesController — selected resolution (non-id lookupKey #16)", () => {
  beforeEach(() => vi.useRealTimers());

  it("scalar value with non-id lookupKey resolves via getList filter", async () => {
    const ctx = makeCtx();
    const getListSpy = vi.spyOn(ctx.dataProvider, "getList");
    const getManySpy = vi.spyOn(ctx.dataProvider, "getMany");
    const c = createChoicesController(ctx, {
      reference: "posts",
      lookupKey: "isbn",
      perPage: 5,
    });
    attach(c);
    await settled(c);
    c.setValue("isbn-20");
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(1),
    );
    expect(getManySpy).not.toHaveBeenCalled();
    // a getList call carried the lookupKey filter
    const selectedCall = getListSpy.mock.calls.find(
      (call) => call[1]?.filter?.isbn === "isbn-20",
    );
    expect(selectedCall).toBeDefined();
    expect(c.getSnapshot().selectedChoices[0]?.isbn).toBe("isbn-20");
    c.destroy();
  });

  it("array value with non-id lookupKey resolves all values via a single getList filter", async () => {
    const ctx = makeCtx();
    // The fake provider does exact-equality filtering; a real backend treats an
    // array filter value as `IN (...)`. Emulate that so the array-value
    // resolution actually returns records (the controller emits ONE getList
    // with the array filter — asserted below).
    const rawGetList = ctx.dataProvider.getList.bind(ctx.dataProvider);
    const getListSpy = vi
      .spyOn(ctx.dataProvider, "getList")
      .mockImplementation(async (resource, params) => {
        const isbn = params.filter?.isbn;
        if (Array.isArray(isbn)) {
          return {
            data: rows.filter((r) => isbn.includes(r.isbn)),
            total: isbn.length,
          };
        }
        return rawGetList(resource, params);
      });
    const c = createChoicesController(ctx, {
      reference: "posts",
      lookupKey: "isbn",
      perPage: 5,
    });
    attach(c);
    await settled(c);
    c.setValue(["isbn-18", "isbn-19"]);
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(2),
    );
    const selectedCall = getListSpy.mock.calls.find((call) => {
      const f = call[1]?.filter?.isbn;
      return Array.isArray(f);
    });
    expect(selectedCall).toBeDefined();
    expect(
      c
        .getSnapshot()
        .selectedChoices.map((r) => r.isbn)
        .sort(),
    ).toEqual(["isbn-18", "isbn-19"]);
    c.destroy();
  });
});

describe("createChoicesController — enableGetChoices gating", () => {
  beforeEach(() => vi.useRealTimers());

  it("gates the CHOICES query only; selected still resolves", async () => {
    const ctx = makeCtx();
    const getListSpy = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, {
      reference: "posts",
      // only fetch choices once a filter is present
      enableGetChoices: (filters) => Object.keys(filters).length > 0,
    });
    attach(c);
    c.setValue(3);
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(1),
    );
    // choices query was NOT fired (no filter yet)
    expect(getListSpy).not.toHaveBeenCalled();
    // selected resolves regardless
    expect(c.getSnapshot().selectedChoices[0]?.id).toBe(3);
    // now supply a filter -> choices fire
    c.setFilters({ title: "t01" });
    await vi.waitFor(() => expect(getListSpy).toHaveBeenCalled());
    c.destroy();
  });
});

describe("createChoicesController — status union", () => {
  beforeEach(() => vi.useRealTimers());

  it("isPending is NOT blocked by a valueless selected query", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    // no setValue at all -> selected query is disabled, must not pin isPending
    await settled(c);
    expect(c.getSnapshot().isPending).toBe(false);
    c.destroy();
  });

  it("surfaces the choices error", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValue(new Error("boom"));
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    expect(String(c.getSnapshot().error)).toContain("boom");
    c.destroy();
  });

  it("a fetch error with a message notifies under that message", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValue(new Error("boom"));
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await vi.waitFor(() =>
      expect(ctx.notifications.getSnapshot()).toHaveLength(1),
    );
    expect(ctx.notifications.getSnapshot()[0]).toMatchObject({
      message: "boom",
      type: "error",
      messageArgs: { _: "Error: boom" },
    });
    c.destroy();
  });

  it("a fetch error with an empty message notifies the generic http error key", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getList").mockRejectedValue(new Error(""));
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await vi.waitFor(() =>
      expect(ctx.notifications.getSnapshot()).toHaveLength(1),
    );
    expect(ctx.notifications.getSnapshot()[0]).toMatchObject({
      message: "chelone.notification.http_error",
      type: "error",
      messageArgs: { _: "Error" },
    });
    c.destroy();
  });

  it("the same error object notifies once", async () => {
    const ctx = makeCtx();
    const failure = new Error("boom");
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    const c = createChoicesController(ctx, { reference: "posts" });
    attach(c);
    await settled(c);
    // With data cached, a failed refetch keeps its error while the next one runs.
    getList.mockRejectedValue(failure);
    c.refetch();
    await vi.waitFor(() => expect(c.getSnapshot().error).toBe(failure));
    c.refetch();
    await vi.waitFor(() => expect(getList).toHaveBeenCalledTimes(3));
    await settled(c);
    expect(ctx.notifications.getSnapshot()).toHaveLength(1);
    c.destroy();
  });

  it("exposes reference and source-derived metadata", () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, {
      reference: "posts",
      source: "post_id",
    });
    expect(c.getSnapshot().resource).toBe("posts");
    expect(c.getSnapshot().source).toBe("post_id");
    expect(c.getSnapshot().isFromReference).toBe(true);
    c.destroy();
  });
});

describe("choiceListsOf", () => {
  it("choiceListsOf returns the three lists of a state", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts" });
    c.setValue(3);
    attach(c);
    await settled(c);
    const state = c.getSnapshot();
    const lists = choiceListsOf(state);
    // The default sort is `id DESC`, so the page reads newest first.
    const pageIds = rows.map((r) => r.id).reverse();
    // The views are the state's own arrays, not copies.
    expect(lists.availableChoices).toBe(state.availableChoices);
    expect(lists.selectedChoices).toBe(state.selectedChoices);
    expect(lists.allChoices).toBe(state.allChoices);
    expect(lists.availableChoices.map((r) => r.id)).toEqual(pageIds);
    expect(lists.selectedChoices.map((r) => r.id)).toEqual([3]);
    // Record 3 is on the page, so `allChoices` is the page itself.
    expect(lists.allChoices.map((r) => r.id)).toEqual(pageIds);
    c.destroy();
  });

  it("choiceListsOf carries a selected record prepended over the page", async () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts", perPage: 5 });
    attach(c);
    await settled(c);
    c.setValue(20);
    await vi.waitFor(() =>
      expect(c.getSnapshot().selectedChoices.length).toBe(1),
    );
    const lists = choiceListsOf(c.getSnapshot());
    expect(lists.availableChoices.map((r) => r.id)).toEqual([
      25, 24, 23, 22, 21,
    ]);
    expect(lists.selectedChoices.map((r) => r.id)).toEqual([20]);
    expect(lists.allChoices.map((r) => r.id)).toEqual([20, 25, 24, 23, 22, 21]);
    c.destroy();
  });

  it("choiceListsOf of a fresh state is three empty lists", () => {
    const ctx = makeCtx();
    const c = createChoicesController(ctx, { reference: "posts" });
    const lists = choiceListsOf(c.getSnapshot());
    expect(lists).toEqual({
      allChoices: [],
      availableChoices: [],
      selectedChoices: [],
    });
    c.destroy();
  });
});
