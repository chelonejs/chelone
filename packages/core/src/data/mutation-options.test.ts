import { MutationObserver, QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { oneKey } from "./keys";
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

  it("optimistic delete removes the cache entry and restores it on error", async () => {
    const c = seed();
    await c.queryClient.fetchQuery(getOneOptions(c, "posts", { id: 1 }));
    const failing: DataProvider<R> = {
      ...c.dataProvider,
      delete: () => Promise.reject(new Error("nope")),
    };
    const ctx = { dataProvider: failing, queryClient: c.queryClient };
    const observer = new MutationObserver(
      c.queryClient,
      deleteMutationOptions(ctx, "posts", { mutationMode: "optimistic" }),
    );
    await expect(observer.mutate({ id: 1 })).rejects.toThrow();
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ id: 1 });
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
