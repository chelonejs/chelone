import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import { createReferenceOneController } from "./reference-one-controller";

// `looseObject` on purpose: these tests filter on plain field names, and a
// strict record keys its filter by `FilterSourceKey` — `q` plus operator
// suffixes only. Filter-key typing is pinned in source-path.test-d.ts.
const resources = defineResources({
  profiles: {
    schema: z.looseObject({
      id: z.number(),
      userId: z.number(),
      bio: z.string(),
      rank: z.number(),
    }),
  },
});

const rows = [
  { id: 1, userId: 1, bio: "first", rank: 2 },
  { id: 2, userId: 1, bio: "second", rank: 1 },
  { id: 3, userId: 1, bio: "third", rank: 3 },
  { id: 4, userId: 2, bio: "other", rank: 1 },
];

function makeCtx() {
  return {
    dataProvider: fakeDataProvider<typeof resources>({
      profiles: structuredClone(rows),
    }),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    store: createStore(),
    notifications: createNotificationStore(),
  };
}
type Ctx = ReturnType<typeof makeCtx>;

const settled = async (c: { getSnapshot: () => { isPending: boolean } }) =>
  vi.waitFor(() => expect(c.getSnapshot().isPending).toBe(false));
const attach = (c: { subscribe: (cb: () => void) => () => void }) =>
  c.subscribe(() => {});
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);
const spyOnReference = (ctx: Ctx) =>
  vi.spyOn(ctx.dataProvider, "getManyReference");

describe("createReferenceOneController", () => {
  beforeEach(() => vi.useRealTimers());

  it("resolves the first row whose target equals the id through getManyReference with perPage 1", async () => {
    const ctx = makeCtx();
    const ref = spyOnReference(ctx);
    const list = vi.spyOn(ctx.dataProvider, "getList");
    const c = createReferenceOneController(ctx, "profiles", {
      target: "userId",
      id: 1,
    });
    expect(c.getSnapshot()).toMatchObject({
      referenceRecord: undefined,
      isPending: true,
    });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().referenceRecord).toMatchObject({
      id: 1,
      bio: "first",
    });
    expect(c.getSnapshot().error).toBeNull();
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledWith("profiles", {
      target: "userId",
      id: 1,
      pagination: { page: 1, perPage: 1 },
      filter: {},
    });
    expect(list).not.toHaveBeenCalled();
    c.destroy();
  });

  it("sort chooses which row is first and filter narrows the lookup", async () => {
    const ctx = makeCtx();
    const sorted = createReferenceOneController(ctx, "profiles", {
      target: "userId",
      id: 1,
      sort: { field: "rank", order: "DESC" },
    });
    attach(sorted);
    await settled(sorted);
    expect(sorted.getSnapshot().referenceRecord?.bio).toBe("third");

    const filtered = createReferenceOneController(ctx, "profiles", {
      target: "userId",
      id: 1,
      sort: { field: "rank", order: "ASC" },
      filter: { bio: "first" },
    });
    attach(filtered);
    await settled(filtered);
    expect(filtered.getSnapshot().referenceRecord?.id).toBe(1);
    sorted.destroy();
    filtered.destroy();
  });

  it("no matching row leaves referenceRecord undefined and the state settled", async () => {
    const c = createReferenceOneController(makeCtx(), "profiles", {
      target: "userId",
      id: 99,
    });
    attach(c);
    await settled(c);
    expect(c.getSnapshot()).toMatchObject({
      referenceRecord: undefined,
      isPending: false,
      isFetching: false,
      error: null,
    });
    c.destroy();
  });

  it("a null id fetches nothing", async () => {
    for (const id of [null, undefined]) {
      const ctx = makeCtx();
      const ref = spyOnReference(ctx);
      const c = createReferenceOneController(ctx, "profiles", {
        target: "userId",
        id,
      });
      expect(c.getSnapshot().isPending).toBe(false);
      attach(c);
      c.refetch();
      expect(c.getSnapshot()).toMatchObject({
        referenceRecord: undefined,
        isPending: false,
        isFetching: false,
      });
      expect(ref).not.toHaveBeenCalled();
      c.destroy();
    }
  });

  it("a provider error is exposed as error and referenceRecord stays undefined", async () => {
    const ctx = makeCtx();
    const boom = new Error("profiles are down");
    spyOnReference(ctx).mockRejectedValue(boom);
    const c = createReferenceOneController(ctx, "profiles", {
      target: "userId",
      id: 1,
    });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().error).toBe(boom);
    expect(c.getSnapshot().referenceRecord).toBeUndefined();
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("construction subscribes nothing and the last unsubscribe releases the observer", async () => {
    const ctx = makeCtx();
    const ref = spyOnReference(ctx);
    const c = createReferenceOneController(ctx, "profiles", {
      target: "userId",
      id: 1,
    });
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(ref).not.toHaveBeenCalled();
    const first = attach(c);
    const second = attach(c);
    await settled(c);
    expect(observerCount(ctx.queryClient)).toBe(1);
    first();
    expect(observerCount(ctx.queryClient)).toBe(1);
    second();
    expect(observerCount(ctx.queryClient)).toBe(0);

    const third = attach(c);
    expect(observerCount(ctx.queryClient)).toBe(1);
    third();
    expect(observerCount(ctx.queryClient)).toBe(0);
    c.destroy();
  });
});
