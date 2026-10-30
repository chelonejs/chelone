import { MutationObserver, QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { manyKey, oneKey } from "./keys";
import {
  createMutationOptions,
  deleteMutationOptions,
  updateMutationOptions,
} from "./mutation-options";
import { getOneOptions } from "./query-options";
import type { DataProvider } from "./types";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), at: z.date() }),
  },
});
type R = typeof resources;
const seed = () => ({
  dataProvider: fakeDataProvider<R>({
    posts: [{ id: 1, title: "a", at: new Date(2026, 0, 1) }],
  }),
  queryClient: new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
});

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
    let resolveUpdate!: () => void;
    const gated: DataProvider<R> = {
      ...c.dataProvider,
      update: (resource, params) =>
        new Promise((resolve) => {
          resolveUpdate = () =>
            resolve(c.dataProvider.update(resource, params) as never);
        }),
    };
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    // wait until the provider has been CALLED (still gated — not resolved)
    await vi.waitFor(() => expect(resolveUpdate).toBeTypeOf("function"));
    // cache reflects the patch before the provider resolves
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ title: "patched" });
    resolveUpdate();
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
    let resolveUpdate!: () => void;
    const gated: DataProvider<R> = {
      ...c.dataProvider,
      update: (resource, params) =>
        new Promise((resolve) => {
          resolveUpdate = () =>
            resolve(c.dataProvider.update(resource, params) as never);
        }),
    };
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    const done = observer.mutate({ id: 1, data: { title: "patched" } });
    await vi.waitFor(() => expect(resolveUpdate).toBeTypeOf("function"));
    resolveFetch([{ id: 1, title: "stale", at: new Date(2026, 0, 1) }]);
    await inFlight.catch(() => undefined);
    expect(c.queryClient.getQueryData(key)).toMatchObject([
      { id: 1, title: "patched" },
    ]);
    resolveUpdate();
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
    c.queryClient.setQueryData(key, [
      { id: 1, title: "a", at: new Date(2026, 0, 1) },
      { id: 2, title: "b", at: new Date(2026, 0, 2) },
    ]);
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
    expect(c.queryClient.getQueryData(key)).toMatchObject([{ id: 2 }]);
    rejectDelete(new Error("nope"));
    await expect(done).rejects.toThrow();
    expect(c.queryClient.getQueryData(key)).toMatchObject([
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ]);
  });

  it("pessimistic update does NOT touch the cache before resolution", async () => {
    const c = seed();
    await c.queryClient.fetchQuery(getOneOptions(c, "posts", { id: 1 }));
    let resolveUpdate!: () => void;
    const gated: DataProvider<R> = {
      ...c.dataProvider,
      update: (resource, params) =>
        new Promise((resolve) => {
          resolveUpdate = () =>
            resolve(c.dataProvider.update(resource, params) as never);
        }),
    };
    const ctx = { dataProvider: gated, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      updateMutationOptions(ctx, "posts"),
    );
    const done = observer.mutate({ id: 1, data: { title: "later" } });
    // wait until the provider has been CALLED (still gated — not resolved)
    await vi.waitFor(() => expect(resolveUpdate).toBeTypeOf("function"));
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ title: "a" });
    resolveUpdate();
    await done;
  });
});
