import { MutationObserver, QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { listKey, manyKey, oneKey, resourceKey } from "./keys";
import {
  createMutationOptions,
  deleteManyMutationOptions,
  deleteMutationOptions,
  updateManyMutationOptions,
  updateMutationOptions,
} from "./mutation-options";
import { getOneOptions } from "./query-options";
import type { DataProvider, GetListResult } from "./types";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), at: z.date() }),
  },
});
type R = typeof resources;
const seed = () => ({
  dataProvider: fakeDataProvider<R>({
    posts: [
      { id: 1, title: "a", at: new Date(2026, 0, 1) },
      { id: 2, title: "b", at: new Date(2026, 0, 1) },
    ],
  }),
  queryClient: new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
});

const listParams = {
  pagination: { page: 1, perPage: 10 },
  sort: { field: "id", order: "ASC" as const },
  filter: {},
};
const at = new Date(2026, 0, 1);

function seedPostsList(queryClient: QueryClient) {
  queryClient.setQueryData<GetListResult>(listKey("posts", listParams), {
    data: [
      { id: 1, title: "a", at },
      { id: 2, title: "b", at },
    ],
    total: 2,
  });
}

const titlesOf = (queryClient: QueryClient) =>
  queryClient
    .getQueryData<GetListResult>(listKey("posts", listParams))
    ?.data.map((r) => r.title);

/** A promise held shut until `open()`, to keep a provider reply in flight. */
const gate = () => {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
};

/** A provider whose `update` calls wait until the test settles them one by one. */
function gatedUpdates(c: ReturnType<typeof seed>) {
  const pending: Array<{ resolve: () => void; reject: (e: Error) => void }> =
    [];
  const dataProvider: DataProvider<R> = { ...c.dataProvider };
  vi.spyOn(dataProvider, "update").mockImplementation(
    async (resource, params) => {
      await new Promise<void>((resolve, reject) => {
        pending.push({ resolve, reject });
      });
      return c.dataProvider.update(resource, params);
    },
  );
  return {
    pending,
    ctx: { dataProvider, queryClient: c.queryClient },
  };
}

describe("mutation option factories", () => {
  it("create (pessimistic default) resolves with the created record", async () => {
    const c = seed();
    const observer = new MutationObserver(
      c.queryClient,
      createMutationOptions(c, "posts"),
    );
    const record = await observer.mutate({
      data: { title: "b", at: new Date() },
    });
    expect(record).toMatchObject({ title: "b" });
  });

  it("optimistic update patches the oneKey cache immediately and keeps it on success", async () => {
    const c = seed();
    await c.queryClient.fetchQuery(getOneOptions(c, "posts", { id: 1 }));
    const held = gate();
    const gated: DataProvider<R> = { ...c.dataProvider };
    const verb = vi
      .spyOn(gated, "update")
      .mockImplementation(async (resource, params) => {
        await held.promise;
        return c.dataProvider.update(resource, params);
      });
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    // wait until the provider has been CALLED (still gated — not resolved)
    await vi.waitFor(() => expect(verb).toHaveBeenCalled());
    // cache reflects the patch before the provider resolves
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ title: "patched" });
    held.open();
    await done;
    // patch survives success (onSettled invalidates, but data stays)
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ title: "patched" });
  });

  it("optimistic update rolls back the snapshot on error — Date survives (structuredClone)", async () => {
    const c = seed();
    await c.queryClient.fetchQuery(getOneOptions(c, "posts", { id: 1 }));
    const failing: DataProvider<R> = {
      ...c.dataProvider,
      update: () => Promise.reject(new Error("server said no")),
    };
    const ctx = { dataProvider: failing, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    await expect(
      observer.mutate({ id: 1, data: { title: "doomed" } }),
    ).rejects.toThrow();
    const restored = c.queryClient.getQueryData<{ title: string; at: Date }>(
      oneKey("posts", { id: 1 }),
    );
    expect(restored?.title).toBe("a");
    expect(restored?.at).toBeInstanceOf(Date); // NOT a string — type-preserving snapshot
  });

  it("optimistic update patches getMany entries immediately and restores them on error", async () => {
    const c = seed();
    const key = manyKey("posts", { ids: [1] });
    const original = [{ id: 1, title: "a", at: new Date(2026, 0, 1) }];
    c.queryClient.setQueryData(key, original);
    let rejectUpdate!: (e: Error) => void;
    const gated: DataProvider<R> = {
      ...c.dataProvider,
      update: () =>
        new Promise((_resolve, reject) => {
          rejectUpdate = reject;
        }),
    };
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    await vi.waitFor(() => expect(rejectUpdate).toBeTypeOf("function"));
    expect(c.queryClient.getQueryData(key)).toMatchObject([
      { id: 1, title: "patched" },
    ]);
    rejectUpdate(new Error("server said no"));
    await expect(done).rejects.toThrow();
    expect(c.queryClient.getQueryData(key)).toMatchObject([
      { id: 1, title: "a" },
    ]);
  });

  it("optimistic update cancels an in-flight getMany so its result cannot overwrite the patch", async () => {
    const c = seed();
    const key = manyKey("posts", { ids: [1] });
    c.queryClient.setQueryData(key, [
      { id: 1, title: "a", at: new Date(2026, 0, 1) },
    ]);
    let resolveFetch!: (records: unknown[]) => void;
    const inFlight = c.queryClient.fetchQuery({
      queryKey: key,
      queryFn: () =>
        new Promise<unknown[]>((resolve) => {
          resolveFetch = resolve;
        }),
      staleTime: 0,
    });
    inFlight.catch(() => undefined);
    await vi.waitFor(() => expect(resolveFetch).toBeTypeOf("function"));
    const held = gate();
    const gated: DataProvider<R> = { ...c.dataProvider };
    const verb = vi
      .spyOn(gated, "update")
      .mockImplementation(async (resource, params) => {
        await held.promise;
        return c.dataProvider.update(resource, params);
      });
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    await vi.waitFor(() => expect(verb).toHaveBeenCalled());
    resolveFetch([{ id: 1, title: "stale", at: new Date(2026, 0, 1) }]);
    await inFlight.catch(() => undefined);
    expect(c.queryClient.getQueryData(key)).toMatchObject([
      { id: 1, title: "patched" },
    ]);
    held.open();
    await done;
  });

  it("optimistic update patches cached getList rows at once and keeps them on success", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const { ctx, pending } = gatedUpdates(c);
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    expect(titlesOf(c.queryClient)).toEqual(["patched", "b"]);
    pending[0]?.resolve();
    await done;
    expect(titlesOf(c.queryClient)).toEqual(["patched", "b"]);
  });

  it("optimistic update restores the patched keys of a getList row on error", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const { ctx, pending } = gatedUpdates(c);
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    expect(titlesOf(c.queryClient)).toEqual(["patched", "b"]);
    pending[0]?.reject(new Error("server said no"));
    await expect(done).rejects.toThrow();
    expect(titlesOf(c.queryClient)).toEqual(["a", "b"]);
  });

  it("a failed optimistic update leaves another in-flight update's patch on a different row", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const { ctx, pending } = gatedUpdates(c);
    const options = updateMutationOptions(ctx, "posts", {
      mutationMode: "optimistic",
    });
    const first = new MutationObserver(c.queryClient, options).mutate({
      id: 1,
      data: { title: "one" },
    });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    const second = new MutationObserver(c.queryClient, options).mutate({
      id: 2,
      data: { title: "two" },
    });
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    expect(titlesOf(c.queryClient)).toEqual(["one", "two"]);
    pending[0]?.reject(new Error("server said no"));
    await expect(first).rejects.toThrow();
    expect(titlesOf(c.queryClient)).toEqual(["a", "two"]);
    pending[1]?.resolve();
    await second;
  });

  it("optimistic update cancels an in-flight getList so its result cannot overwrite the patch", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    let resolveFetch!: (result: GetListResult) => void;
    const inFlight = c.queryClient.fetchQuery({
      queryKey: listKey("posts", listParams),
      queryFn: () =>
        new Promise<GetListResult>((resolve) => {
          resolveFetch = resolve;
        }),
      staleTime: 0,
    });
    inFlight.catch(() => undefined);
    await vi.waitFor(() => expect(resolveFetch).toBeTypeOf("function"));
    const { ctx, pending } = gatedUpdates(c);
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    resolveFetch({
      data: [
        { id: 1, title: "stale", at },
        { id: 2, title: "b", at },
      ],
      total: 2,
    });
    await inFlight.catch(() => undefined);
    expect(titlesOf(c.queryClient)).toEqual(["patched", "b"]);
    pending[0]?.resolve();
    await done;
  });

  it("two overlapping optimistic updates refetch the lists once, when the last one settles", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const invalidate = vi.spyOn(c.queryClient, "invalidateQueries");
    const { ctx, pending } = gatedUpdates(c);
    const options = updateMutationOptions(ctx, "posts", {
      mutationMode: "optimistic",
    });
    const first = new MutationObserver(c.queryClient, options).mutate({
      id: 1,
      data: { title: "one" },
    });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    const second = new MutationObserver(c.queryClient, options).mutate({
      id: 2,
      data: { title: "two" },
    });
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    pending[0]?.resolve();
    await first;
    expect(invalidate).not.toHaveBeenCalled();
    expect(titlesOf(c.queryClient)).toEqual(["one", "two"]);
    pending[1]?.resolve();
    await second;
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["posts"] });
  });

  it("two optimistic updates answered in the same tick still refetch the lists once", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const invalidate = vi.spyOn(c.queryClient, "invalidateQueries");
    const { ctx, pending } = gatedUpdates(c);
    const options = updateMutationOptions(ctx, "posts", {
      mutationMode: "optimistic",
    });
    const first = new MutationObserver(c.queryClient, options).mutate({
      id: 1,
      data: { title: "one" },
    });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    const second = new MutationObserver(c.queryClient, options).mutate({
      id: 2,
      data: { title: "two" },
    });
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    pending[0]?.resolve();
    pending[1]?.resolve();
    await Promise.all([first, second]);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("a lone optimistic update still refetches the lists when it settles", async () => {
    const c = seed();
    const invalidate = vi.spyOn(c.queryClient, "invalidateQueries");
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(c, "posts", { mutationMode: "optimistic" }),
    );
    await observer.mutate({ id: 1, data: { title: "patched" } });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("pessimistic update leaves cached lists untouched before resolution", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const { ctx, pending } = gatedUpdates(c);
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts"),
    );
    const done = observer.mutate({ id: 1, data: { title: "later" } });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    expect(titlesOf(c.queryClient)).toEqual(["a", "b"]);
    pending[0]?.resolve();
    await done;
  });

  it("optimistic delete removes the cache entry and restores it on error", async () => {
    const c = seed();
    await c.queryClient.fetchQuery(getOneOptions(c, "posts", { id: 1 }));
    let rejectDelete!: (e: Error) => void;
    let deleteCalled = false;
    const failing: DataProvider<R> = {
      ...c.dataProvider,
      delete: () =>
        new Promise((_resolve, reject) => {
          deleteCalled = true;
          rejectDelete = reject;
        }),
    };
    const ctx = { dataProvider: failing, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      deleteMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1 });
    await vi.waitFor(() => expect(deleteCalled).toBe(true));
    // mid-flight: the optimistic removal is observable while the provider is pending
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toBeUndefined();
    rejectDelete(new Error("nope"));
    await expect(done).rejects.toThrow();
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ id: 1 });
  });

  it("optimistic delete removes the id from getMany entries and restores them on error", async () => {
    const c = seed();
    const key = manyKey("posts", { ids: [1, 2] });
    const original = [
      { id: 1, title: "a", at: new Date(2026, 0, 1) },
      { id: 2, title: "b", at: new Date(2026, 0, 2) },
    ];
    c.queryClient.setQueryData(key, original);
    let rejectDelete!: (e: Error) => void;
    const failing: DataProvider<R> = {
      ...c.dataProvider,
      delete: () =>
        new Promise((_resolve, reject) => {
          rejectDelete = reject;
        }),
    };
    const ctx = { dataProvider: failing, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      deleteMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1 });
    await vi.waitFor(() => expect(rejectDelete).toBeTypeOf("function"));
    expect(c.queryClient.getQueryData(key)).toEqual([original[1]]);
    rejectDelete(new Error("nope"));
    await expect(done).rejects.toThrow();
    expect(c.queryClient.getQueryData(key)).toEqual(original);
  });

  it("optimistic delete keeps the id out of getMany entries after success", async () => {
    const c = seed();
    const key = manyKey("posts", { ids: [1, 2] });
    const second = { id: 2, title: "b", at: new Date(2026, 0, 2) };
    c.queryClient.setQueryData(key, [
      { id: 1, title: "a", at: new Date(2026, 0, 1) },
      second,
    ]);
    const observer = new MutationObserver(
      c.queryClient,
      deleteMutationOptions(c, "posts", { mutationMode: "optimistic" }),
    );
    await observer.mutate({ id: 1 });
    expect(c.queryClient.getQueryData(key)).toEqual([second]);
  });

  it("pessimistic delete does NOT touch getMany entries before resolution", async () => {
    const c = seed();
    const key = manyKey("posts", { ids: [1] });
    const original = [{ id: 1, title: "a", at: new Date(2026, 0, 1) }];
    c.queryClient.setQueryData(key, original);
    const held = gate();
    const gated: DataProvider<R> = { ...c.dataProvider };
    const verb = vi
      .spyOn(gated, "delete")
      .mockImplementation(async (resource, params) => {
        await held.promise;
        return c.dataProvider.delete(resource, params);
      });
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      deleteMutationOptions(ctx, "posts"),
    );
    const done = observer.mutate({ id: 1 });
    await vi.waitFor(() => expect(verb).toHaveBeenCalled());
    expect(c.queryClient.getQueryData(key)).toEqual(original);
    held.open();
    await done;
  });

  it("pessimistic update does NOT touch the cache before resolution", async () => {
    const c = seed();
    await c.queryClient.fetchQuery(getOneOptions(c, "posts", { id: 1 }));
    const held = gate();
    const gated: DataProvider<R> = { ...c.dataProvider };
    const verb = vi
      .spyOn(gated, "update")
      .mockImplementation(async (resource, params) => {
        await held.promise;
        return c.dataProvider.update(resource, params);
      });
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts"),
    );
    const done = observer.mutate({ id: 1, data: { title: "later" } });
    // wait until the provider has been CALLED (still gated — not resolved)
    await vi.waitFor(() => expect(verb).toHaveBeenCalled());
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ title: "a" });
    held.open();
    await done;
  });
  it("deleteManyMutationOptions calls deleteMany and invalidates the resource", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const verb = vi.spyOn(c.dataProvider, "deleteMany");
    const invalidate = vi.spyOn(c.queryClient, "invalidateQueries");
    const observer = new MutationObserver(
      c.queryClient,
      deleteManyMutationOptions(c, "posts"),
    );
    const ids = await observer.mutate({ ids: [1, 2] });
    expect(ids).toEqual([1, 2]);
    expect(verb).toHaveBeenCalledWith("posts", { ids: [1, 2] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: resourceKey("posts") });
    expect(
      c.queryClient.getQueryState(listKey("posts", listParams))?.isInvalidated,
    ).toBe(true);
  });

  it("deleteManyMutationOptions still invalidates the resource when deleteMany rejects", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    vi.spyOn(c.dataProvider, "deleteMany").mockRejectedValue(new Error("no"));
    const observer = new MutationObserver(
      c.queryClient,
      deleteManyMutationOptions(c, "posts"),
    );
    await expect(observer.mutate({ ids: [1] })).rejects.toThrow("no");
    expect(
      c.queryClient.getQueryState(listKey("posts", listParams))?.isInvalidated,
    ).toBe(true);
  });

  it("updateManyMutationOptions calls updateMany and invalidates the resource", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    const verb = vi.spyOn(c.dataProvider, "updateMany");
    const invalidate = vi.spyOn(c.queryClient, "invalidateQueries");
    const observer = new MutationObserver(
      c.queryClient,
      updateManyMutationOptions(c, "posts"),
    );
    const ids = await observer.mutate({ ids: [1, 2], data: { title: "x" } });
    expect(ids).toEqual([1, 2]);
    expect(verb).toHaveBeenCalledWith("posts", {
      ids: [1, 2],
      data: { title: "x" },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: resourceKey("posts") });
    expect(
      c.queryClient.getQueryState(listKey("posts", listParams))?.isInvalidated,
    ).toBe(true);
  });

  it("updateManyMutationOptions still invalidates the resource when updateMany rejects", async () => {
    const c = seed();
    seedPostsList(c.queryClient);
    vi.spyOn(c.dataProvider, "updateMany").mockRejectedValue(new Error("no"));
    const observer = new MutationObserver(
      c.queryClient,
      updateManyMutationOptions(c, "posts"),
    );
    await expect(
      observer.mutate({ ids: [1], data: { title: "x" } }),
    ).rejects.toThrow("no");
    expect(
      c.queryClient.getQueryState(listKey("posts", listParams))?.isInvalidated,
    ).toBe(true);
  });
});
