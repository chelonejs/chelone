import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ValidationError } from "../data/errors";
import { fakeDataProvider } from "../data/fake-provider";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import {
  createCreateController,
  createDeleteController,
  createEditController,
  createShowController,
} from "./record-controllers";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

const makeCtx = () => ({
  dataProvider: fakeDataProvider<typeof resources>({
    posts: [{ id: 1, title: "a" }],
  }),
  queryClient: new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
  notifications: createNotificationStore(),
});

/** A promise held shut until `open()`, to keep a provider reply in flight. */
const gate = () => {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
};

const settled = (c: { getSnapshot: () => { isPending: boolean } }) =>
  vi.waitFor(() => expect(c.getSnapshot().isPending).toBe(false));

/**
 * Post-4R lifecycle: construction is INERT — acquisition happens on the FIRST
 * subscriber. The brief's tests predate the redesign and subscribed implicitly
 * via settled() polling; vanilla controllers now need an explicit subscriber
 * for the fetch to start, so every test attaches up front (mirroring real
 * vanilla usage). Behavior contracts are unchanged.
 */
const attach = (c: { subscribe: (cb: () => void) => () => void }) =>
  c.subscribe(() => {});

/** Live QueryObserver subscriptions across the whole cache. */
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);

/**
 * ctx whose mutations GC instantly once detached (gcTime: 0) — makes the
 * MutationObserver release (reset on settle/teardown) observable: a retained
 * mutation stays in getMutationCache().getAll() forever, a released one
 * disappears on the next timer tick.
 */
const makeGcCtx = () => ({
  ...makeCtx(),
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false, gcTime: 0 },
    },
  }),
});

const mutationCacheEmpty = (queryClient: QueryClient) =>
  vi.waitFor(() =>
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0),
  );

describe("createShowController", () => {
  it("fetches the record", async () => {
    const c = createShowController(makeCtx(), "posts", { id: 1 });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().record).toMatchObject({ id: 1, title: "a" });
    expect(c.getSnapshot().error).toBeNull();
    c.destroy();
  });

  it("missing record notifies item_doesnt_exist and requests list redirect", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const c = createShowController(ctx, "posts", { id: 99, onRedirect });
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.item_doesnt_exist" &&
            n.type === "error",
        ),
    ).toBe(true);
    expect(onRedirect).toHaveBeenCalledWith("list", "posts");
    c.destroy();
  });

  it("fetch error notifies once, not once per observer emission", async () => {
    const ctx = makeCtx();
    const c = createShowController(ctx, "posts", { id: 99 });
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    expect(ctx.notifications.getSnapshot()).toHaveLength(1);
    c.destroy();
  });

  it("fetched record with a mismatched id (loose) surfaces an error, not the record", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "getOne").mockResolvedValue({
      data: { id: 2, title: "z" },
    });
    const c = createShowController(ctx, "posts", { id: 1 });
    attach(c);
    await vi.waitFor(() => expect(c.getSnapshot().error).toBeTruthy());
    expect(c.getSnapshot().record).toBeUndefined();
    // A mismatch is a LOCAL consistency error, not a fetch error: no notify.
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("id comparison is loose: a string '1' matches the requested number 1", async () => {
    const ctx = makeCtx();
    // A server reply is wire JSON: the string id is a deliberate type violation.
    vi.spyOn(ctx.dataProvider, "getOne").mockResolvedValue(
      JSON.parse('{"data":{"id":"1","title":"a"}}'),
    );
    const c = createShowController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().record).toMatchObject({ id: "1", title: "a" });
    expect(c.getSnapshot().error).toBeNull();
    c.destroy();
  });

  it("enabled: false never fetches, even attached", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getOne");
    const c = createShowController(ctx, "posts", { id: 1, enabled: false });
    attach(c);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(spy).not.toHaveBeenCalled();
    expect(c.getSnapshot().isPending).toBe(true);
    c.destroy();
  });

  it("construction is inert; acquires on first subscribe, releases on last unsubscribe", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "getOne");
    const c = createShowController(ctx, "posts", { id: 1 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(spy).not.toHaveBeenCalled();
    expect(observerCount(ctx.queryClient)).toBe(0);
    const detach = attach(c);
    await settled(c);
    expect(observerCount(ctx.queryClient)).toBe(1);
    detach();
    expect(observerCount(ctx.queryClient)).toBe(0);
    c.destroy();
  });
});

describe("createEditController", () => {
  it("save (pessimistic default) updates, notifies updated, requests list redirect", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const c = createEditController(ctx, "posts", { id: 1, onRedirect });
    attach(c);
    await settled(c);
    await c.save({ title: "b" });
    expect((await ctx.dataProvider.getOne("posts", { id: 1 })).data.title).toBe(
      "b",
    );
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.updated" &&
            n.type === "success" &&
            n.messageArgs?.smart_count === 1,
        ),
    ).toBe(true);
    expect(onRedirect).toHaveBeenCalledWith(
      "list",
      "posts",
      1,
      expect.objectContaining({ title: "b" }),
    );
    c.destroy();
  });

  it("transform priority: call-time beats option; receives previousData", async () => {
    const ctx = makeCtx();
    const optionTransform = vi.fn((d: { title?: string }) => ({
      ...d,
      via: "option",
    }));
    const c = createEditController(ctx, "posts", {
      id: 1,
      transform: optionTransform,
    });
    attach(c);
    await settled(c);
    await c.save(
      { title: "x" },
      {
        transform: (d, extra) => ({
          ...d,
          title: `${d.title}-${defined(extra?.previousData).title}`,
        }),
      },
    );
    expect(optionTransform).not.toHaveBeenCalled();
    expect((await ctx.dataProvider.getOne("posts", { id: 1 })).data.title).toBe(
      "x-a",
    );
    c.destroy();
  });

  it("option transform applies when no call-time transform is given (async supported)", async () => {
    const ctx = makeCtx();
    const c = createEditController(ctx, "posts", {
      id: 1,
      transform: async (d) => ({ ...d, title: `${d.title}!` }),
    });
    attach(c);
    await settled(c);
    await c.save({ title: "b" });
    expect((await ctx.dataProvider.getOne("posts", { id: 1 })).data.title).toBe(
      "b!",
    );
    c.destroy();
  });

  it("ValidationError resolves with fieldErrors and does NOT notify", async () => {
    const ctx = makeCtx();
    ctx.dataProvider.update = () =>
      Promise.reject(new ValidationError("invalid", { title: "Required" }));
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    const errors = await c.save({ title: "" });
    expect(errors).toEqual({ title: "Required" });
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("other errors notify http_error and resolve undefined", async () => {
    const ctx = makeCtx();
    ctx.dataProvider.update = () => Promise.reject(new Error("boom"));
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    expect(await c.save({ title: "y" })).toBeUndefined();
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.http_error" &&
            n.type === "error" &&
            n.messageArgs?._ === "Error: boom",
        ),
    ).toBe(true);
    c.destroy();
  });

  it("caller onSuccess REPLACES the default notify + redirect", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const onSuccess = vi.fn();
    const c = createEditController(ctx, "posts", { id: 1, onRedirect });
    attach(c);
    await settled(c);
    await c.save({ title: "b" }, { onSuccess });
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: "b" }),
    );
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    expect(onRedirect).not.toHaveBeenCalled();
    c.destroy();
  });

  it("caller onError REPLACES the default error notify", async () => {
    const ctx = makeCtx();
    ctx.dataProvider.update = () => Promise.reject(new Error("boom"));
    const onError = vi.fn();
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    expect(await c.save({ title: "y" }, { onError })).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
    );
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("ValidationError with caller onError: onError fires, save STILL resolves with fieldErrors", async () => {
    const ctx = makeCtx();
    const validationError = new ValidationError("invalid", {
      title: "Required",
    });
    ctx.dataProvider.update = () => Promise.reject(validationError);
    const onError = vi.fn();
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    const errors = await c.save({ title: "" }, { onError });
    // The fieldErrors resolution is save()'s RETURN contract (P5 forms build
    // on it) — a caller onError replaces side-effect handling, not the return.
    expect(errors).toEqual({ title: "Required" });
    expect(onError).toHaveBeenCalledWith(validationError);
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("saving reflects the in-flight mutation", async () => {
    const ctx = makeCtx();
    const inner = ctx.dataProvider.update.bind(ctx.dataProvider);
    const held = gate();
    vi.spyOn(ctx.dataProvider, "update").mockImplementation(
      async (resource, params) => {
        await held.promise;
        return inner(resource, params);
      },
    );
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    expect(c.getSnapshot().saving).toBe(false);
    const done = c.save({ title: "b" });
    await vi.waitFor(() => expect(c.getSnapshot().saving).toBe(true));
    held.open();
    await done;
    expect(c.getSnapshot().saving).toBe(false);
    c.destroy();
  });

  it("success notification uses the resource-scoped key when translated", async () => {
    const ctx = {
      ...makeCtx(),
      translate: (key: string) =>
        key === "resources.posts.notifications.updated" ? "Post updated" : key,
    };
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    await c.save({ title: "b" });
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "resources.posts.notifications.updated"),
    ).toBe(true);
    c.destroy();
  });

  it("call-time meta reaches the provider alongside previousData", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "update");
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    await c.save({ title: "b" }, { meta: { reason: "test" } });
    expect(spy).toHaveBeenCalledWith("posts", {
      id: 1,
      data: { title: "b" },
      previousData: { id: 1, title: "a" },
      meta: { reason: "test" },
    });
    c.destroy();
  });

  it("save works while DETACHED (imperative use): mutation + default side effects run", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const c = createEditController(ctx, "posts", { id: 1, onRedirect });
    // never attached — no record fetched, previousData undefined
    await c.save({ title: "c" });
    expect((await ctx.dataProvider.getOne("posts", { id: 1 })).data.title).toBe(
      "c",
    );
    expect(onRedirect).toHaveBeenCalledWith(
      "list",
      "posts",
      1,
      expect.objectContaining({ title: "c" }),
    );
    c.destroy();
  });

  it("destroy while attached tears down observers; save becomes a no-op", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "update");
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    c.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(await c.save({ title: "b" })).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("attached save: the settled mutation is released from the MutationCache", async () => {
    const ctx = makeGcCtx();
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    await c.save({ title: "b" });
    // Released on settle, while still attached — not just at teardown.
    await mutationCacheEmpty(ctx.queryClient);
    c.destroy();
  });

  it("detached save: the transient observer's mutation is released", async () => {
    const ctx = makeGcCtx();
    const c = createEditController(ctx, "posts", { id: 1 });
    // never attached — transient observer per save
    await c.save({ title: "c" });
    await c.save({ title: "d" });
    await mutationCacheEmpty(ctx.queryClient);
    c.destroy();
  });

  it("destroy mid-save: the in-flight mutation is released once it settles", async () => {
    const ctx = makeGcCtx();
    const inner = ctx.dataProvider.update.bind(ctx.dataProvider);
    const held = gate();
    vi.spyOn(ctx.dataProvider, "update").mockImplementation(
      async (resource, params) => {
        await held.promise;
        return inner(resource, params);
      },
    );
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    const done = c.save({ title: "b" });
    await vi.waitFor(() =>
      expect(ctx.queryClient.getMutationCache().getAll()).toHaveLength(1),
    );
    c.destroy();
    held.open();
    await done;
    await mutationCacheEmpty(ctx.queryClient);
  });

  it("overlapping attached saves: both mutations released after both settle", async () => {
    const ctx = makeGcCtx();
    const inner = ctx.dataProvider.update.bind(ctx.dataProvider);
    const gates: Array<ReturnType<typeof gate>> = [];
    vi.spyOn(ctx.dataProvider, "update").mockImplementation(
      async (resource, params) => {
        const held = gate();
        gates.push(held);
        await held.promise;
        return inner(resource, params);
      },
    );
    const c = createEditController(ctx, "posts", { id: 1 });
    attach(c);
    await settled(c);
    const first = c.save({ title: "b" });
    await vi.waitFor(() => expect(gates).toHaveLength(1));
    const second = c.save({ title: "c" });
    await vi.waitFor(() => expect(gates).toHaveLength(2));
    for (const held of gates) held.open();
    await Promise.all([first, second]);
    expect(c.getSnapshot().saving).toBe(false);
    await mutationCacheEmpty(ctx.queryClient);
    c.destroy();
  });
});

describe("createCreateController", () => {
  it("save creates, notifies created, redirects to edit of the new record", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const c = createCreateController(ctx, "posts", { onRedirect });
    const result = await c.save({ title: "new" });
    expect(result).toBeUndefined(); // success path resolves void
    const created = ctx.notifications
      .getSnapshot()
      .find((n) => n.message === "chelone.notification.created");
    expect(created?.type).toBe("success");
    expect(created?.messageArgs?.smart_count).toBe(1);
    expect(onRedirect).toHaveBeenCalledWith(
      "edit",
      "posts",
      expect.anything(),
      expect.objectContaining({ title: "new" }),
    );
    c.destroy();
  });

  it("NO fetch at all, even attached; isPending is false from birth", async () => {
    const ctx = makeCtx();
    const getOne = vi.spyOn(ctx.dataProvider, "getOne");
    const getList = vi.spyOn(ctx.dataProvider, "getList");
    const c = createCreateController(ctx, "posts");
    expect(c.getSnapshot()).toMatchObject({
      record: {},
      saving: false,
      isPending: false,
    });
    attach(c);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getOne).not.toHaveBeenCalled();
    expect(getList).not.toHaveBeenCalled();
    expect(observerCount(ctx.queryClient)).toBe(0);
    c.destroy();
  });

  it("options.record seeds the initial record", () => {
    const c = createCreateController(makeCtx(), "posts", {
      record: { title: "seed" },
    });
    expect(c.getSnapshot().record).toEqual({ title: "seed" });
    c.destroy();
  });

  it("transform priority: call-time beats option; create transforms get NO previousData", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "create");
    const optionTransform = vi.fn((d: { title?: string }) => ({
      ...d,
      via: "option",
    }));
    const callTimeTransform = vi.fn((d: { title?: string }) => ({
      ...d,
      title: `${d.title}!`,
    }));
    const c = createCreateController(ctx, "posts", {
      transform: optionTransform,
    });
    await c.save({ title: "n" }, { transform: callTimeTransform });
    expect(optionTransform).not.toHaveBeenCalled();
    // Exactly one argument: create transforms receive no previousData extra.
    expect(callTimeTransform.mock.calls).toEqual([[{ title: "n" }]]);
    expect(spy).toHaveBeenCalledWith("posts", {
      data: { title: "n!" },
      meta: undefined,
    });
    c.destroy();
  });

  it("option transform applies when no call-time transform is given (async supported)", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "create");
    const c = createCreateController(ctx, "posts", {
      transform: async (d) => ({ ...d, title: `${d.title}?` }),
    });
    await c.save({ title: "n" }, { meta: { reason: "test" } });
    expect(spy).toHaveBeenCalledWith("posts", {
      data: { title: "n?" },
      meta: { reason: "test" },
    });
    c.destroy();
  });

  it("ValidationError resolves with fieldErrors and does NOT notify", async () => {
    const ctx = makeCtx();
    ctx.dataProvider.create = () =>
      Promise.reject(new ValidationError("invalid", { title: "Required" }));
    const c = createCreateController(ctx, "posts");
    const errors = await c.save({ title: "" });
    expect(errors).toEqual({ title: "Required" });
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("other errors notify http_error and resolve undefined", async () => {
    const ctx = makeCtx();
    ctx.dataProvider.create = () => Promise.reject(new Error("boom"));
    const c = createCreateController(ctx, "posts");
    expect(await c.save({ title: "n" })).toBeUndefined();
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.http_error" &&
            n.type === "error" &&
            n.messageArgs?._ === "Error: boom",
        ),
    ).toBe(true);
    c.destroy();
  });

  it("caller onSuccess REPLACES the default notify + redirect", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const onSuccess = vi.fn();
    const c = createCreateController(ctx, "posts", { onRedirect });
    await c.save({ title: "n" }, { onSuccess });
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "n" }),
    );
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    expect(onRedirect).not.toHaveBeenCalled();
    c.destroy();
  });

  it("caller onError REPLACES the default error notify", async () => {
    const ctx = makeCtx();
    ctx.dataProvider.create = () => Promise.reject(new Error("boom"));
    const onError = vi.fn();
    const c = createCreateController(ctx, "posts");
    expect(await c.save({ title: "n" }, { onError })).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
    );
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("saving reflects the in-flight create", async () => {
    const ctx = makeCtx();
    const inner = ctx.dataProvider.create.bind(ctx.dataProvider);
    const held = gate();
    vi.spyOn(ctx.dataProvider, "create").mockImplementation(
      async (resource, params) => {
        await held.promise;
        return inner(resource, params);
      },
    );
    const c = createCreateController(ctx, "posts");
    attach(c);
    expect(c.getSnapshot().saving).toBe(false);
    const done = c.save({ title: "n" });
    await vi.waitFor(() => expect(c.getSnapshot().saving).toBe(true));
    held.open();
    await done;
    expect(c.getSnapshot().saving).toBe(false);
    c.destroy();
  });

  it("success notification uses the resource-scoped key when translated", async () => {
    const ctx = {
      ...makeCtx(),
      translate: (key: string) =>
        key === "resources.posts.notifications.created" ? "Post created" : key,
    };
    const c = createCreateController(ctx, "posts");
    await c.save({ title: "n" });
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "resources.posts.notifications.created"),
    ).toBe(true);
    c.destroy();
  });

  it("attached save: the settled mutation is released from the MutationCache", async () => {
    const ctx = makeGcCtx();
    const c = createCreateController(ctx, "posts");
    attach(c);
    await c.save({ title: "n" });
    await mutationCacheEmpty(ctx.queryClient);
    c.destroy();
  });

  it("detached save: the transient observer's mutation is released", async () => {
    const ctx = makeGcCtx();
    const c = createCreateController(ctx, "posts");
    await c.save({ title: "n" });
    await c.save({ title: "m" });
    await mutationCacheEmpty(ctx.queryClient);
    c.destroy();
  });

  it("destroy: save becomes a no-op", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "create");
    const c = createCreateController(ctx, "posts");
    c.destroy();
    expect(await c.save({ title: "n" })).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("createDeleteController", () => {
  it("deleteOne deletes, notifies, redirects, and strips the id from KV selection", async () => {
    const ctx = { ...makeCtx(), store: createStore() };
    ctx.store.setItem("posts.selectedIds", [1, 2]);
    const onRedirect = vi.fn();
    const c = createDeleteController(ctx, "posts", { onRedirect });
    await c.deleteOne(1);
    await expect(ctx.dataProvider.getOne("posts", { id: 1 })).rejects.toThrow();
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.deleted" &&
            n.type === "success" &&
            n.messageArgs?.smart_count === 1,
        ),
    ).toBe(true);
    expect(onRedirect).toHaveBeenCalledWith("list", "posts");
    expect(ctx.store.getItem("posts.selectedIds")).toEqual([2]);
    c.destroy();
  });

  it("selection strip is immutable: the original array is never mutated", async () => {
    const ctx = { ...makeCtx(), store: createStore() };
    const original = [1, 2];
    ctx.store.setItem("posts.selectedIds", original);
    const c = createDeleteController(ctx, "posts");
    await c.deleteOne(1);
    expect(original).toEqual([1, 2]);
    expect(ctx.store.getItem("posts.selectedIds")).toEqual([2]);
    c.destroy();
  });

  it("an unselected id leaves the selection untouched (same reference, no write)", async () => {
    const ctx = { ...makeCtx(), store: createStore() };
    const selection = [2, 3];
    ctx.store.setItem("posts.selectedIds", selection);
    const c = createDeleteController(ctx, "posts");
    await c.deleteOne(1);
    expect(ctx.store.getItem("posts.selectedIds")).toBe(selection);
    c.destroy();
  });

  it("no KV store in ctx: deleteOne still deletes, notifies, and redirects", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const c = createDeleteController(ctx, "posts", { onRedirect });
    await c.deleteOne(1);
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "chelone.notification.deleted"),
    ).toBe(true);
    expect(onRedirect).toHaveBeenCalledWith("list", "posts");
    c.destroy();
  });

  it("caller onSuccess REPLACES the default notify + redirect + selection strip", async () => {
    const ctx = { ...makeCtx(), store: createStore() };
    ctx.store.setItem("posts.selectedIds", [1, 2]);
    const onRedirect = vi.fn();
    const onSuccess = vi.fn();
    const c = createDeleteController(ctx, "posts", { onRedirect });
    await c.deleteOne(1, { onSuccess });
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: "a" }),
    );
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    expect(onRedirect).not.toHaveBeenCalled();
    expect(ctx.store.getItem("posts.selectedIds")).toEqual([1, 2]);
    c.destroy();
  });

  it("ValidationError resolves with fieldErrors and does NOT notify", async () => {
    const ctx = makeCtx();
    ctx.dataProvider.delete = () =>
      Promise.reject(new ValidationError("invalid", { id: "Locked" }));
    const c = createDeleteController(ctx, "posts");
    const errors = await c.deleteOne(1);
    expect(errors).toEqual({ id: "Locked" });
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("other errors notify http_error and resolve undefined", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const c = createDeleteController(ctx, "posts", { onRedirect });
    expect(await c.deleteOne(99)).toBeUndefined(); // fake provider rejects: not found
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.http_error" &&
            n.type === "error" &&
            String(n.messageArgs?._).includes("not found"),
        ),
    ).toBe(true);
    expect(onRedirect).not.toHaveBeenCalled();
    c.destroy();
  });

  it("caller onError REPLACES the default error notify", async () => {
    const ctx = makeCtx();
    const onError = vi.fn();
    const c = createDeleteController(ctx, "posts");
    expect(await c.deleteOne(99, { onError })).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("99") }),
    );
    expect(ctx.notifications.getSnapshot()).toEqual([]);
    c.destroy();
  });

  it("previousData and meta reach the provider", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "delete");
    const c = createDeleteController(ctx, "posts");
    await c.deleteOne(1, {
      previousData: { id: 1, title: "a" },
      meta: { reason: "test" },
    });
    expect(spy).toHaveBeenCalledWith("posts", {
      id: 1,
      previousData: { id: 1, title: "a" },
      meta: { reason: "test" },
    });
    c.destroy();
  });

  it("saving reflects the in-flight delete", async () => {
    const ctx = makeCtx();
    const inner = ctx.dataProvider.delete.bind(ctx.dataProvider);
    const held = gate();
    vi.spyOn(ctx.dataProvider, "delete").mockImplementation(
      async (resource, params) => {
        await held.promise;
        return inner(resource, params);
      },
    );
    const c = createDeleteController(ctx, "posts");
    attach(c);
    expect(c.getSnapshot().saving).toBe(false);
    const done = c.deleteOne(1);
    await vi.waitFor(() => expect(c.getSnapshot().saving).toBe(true));
    held.open();
    await done;
    expect(c.getSnapshot().saving).toBe(false);
    c.destroy();
  });

  it("attached deleteOne: the settled mutation is released from the MutationCache", async () => {
    const ctx = makeGcCtx();
    const c = createDeleteController(ctx, "posts");
    attach(c);
    await c.deleteOne(1);
    await mutationCacheEmpty(ctx.queryClient);
    c.destroy();
  });

  it("destroy: deleteOne becomes a no-op", async () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.dataProvider, "delete");
    const c = createDeleteController(ctx, "posts");
    c.destroy();
    expect(await c.deleteOne(1)).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
