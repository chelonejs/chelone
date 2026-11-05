import { FieldApi } from "@tanstack/form-core";
import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ValidationError } from "../data/errors";
import { fakeDataProvider } from "../data/fake-provider";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import {
  createCreateFormController,
  createEditFormController,
  resolveHydrationAction,
} from "./edit-create-form";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      subtitle: z.string().nullable().optional(),
      notes: z.string().optional(),
    }),
  },
});

type Post = z.infer<(typeof resources)["posts"]["schema"]>;

const makeCtx = () => ({
  dataProvider: fakeDataProvider<typeof resources>({
    posts: [{ id: 1, title: "a", subtitle: "s" }],
  }),
  queryClient: new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
  notifications: createNotificationStore(),
});

/** Live QueryObserver subscriptions across the whole cache. */
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);

const recordLoaded = (c: { getSnapshot: () => { record: Post | undefined } }) =>
  vi.waitFor(() => expect(c.getSnapshot().record).toBeDefined());

describe("resolveHydrationAction", () => {
  it("rebaselines an untouched form (first hydration and same-id refetch)", () => {
    expect(resolveHydrationAction(undefined, 1, false)).toBe("rebaseline");
    expect(resolveHydrationAction(1, 1, false)).toBe("rebaseline");
  });

  it("hard-resets on a record id change (drops dirty values)", () => {
    expect(resolveHydrationAction(1, 2, true)).toBe("hard-reset");
    expect(resolveHydrationAction(1, 2, false)).toBe("hard-reset");
  });

  it("keeps dirty values on a touched form (same id, loose comparison)", () => {
    expect(resolveHydrationAction(1, 1, true)).toBe("keep-dirty");
    expect(resolveHydrationAction(1, "1", true)).toBe("keep-dirty");
  });

  it("partial-applies the FIRST record arrival into a touched form (clean fields must hydrate)", () => {
    // Keeping construction defaults on clean fields here would make the next
    // save send those defaults over the real record fields (data wipe).
    expect(resolveHydrationAction(undefined, 1, true)).toBe("partial-apply");
  });
});

describe("createEditFormController", () => {
  it("ONE lifecycle: construction inert; first subscribe fetches AND mounts the form; last unsubscribe releases", async () => {
    const ctx = makeCtx();
    const getOne = vi.spyOn(ctx.dataProvider, "getOne");
    const onMount = vi.fn(() => undefined);
    const c = createEditFormController(ctx, "posts", {
      id: 1,
      formOptions: { validators: { onMount } },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getOne).not.toHaveBeenCalled();
    expect(onMount).not.toHaveBeenCalled();
    expect(observerCount(ctx.queryClient)).toBe(0);

    const detach = c.subscribe(() => {});
    expect(onMount).toHaveBeenCalledTimes(1);
    await recordLoaded(c);
    expect(observerCount(ctx.queryClient)).toBeGreaterThan(0);

    detach();
    expect(observerCount(ctx.queryClient)).toBe(0);
    c.destroy();
  });

  it("hydrates an untouched form from the record (deep merge, record wins) WITHOUT dirtying", async () => {
    const ctx = makeCtx();
    const c = createEditFormController(ctx, "posts", {
      id: 1,
      defaultValues: { title: "default-title", notes: "default note" },
    });
    c.subscribe(() => {});
    await recordLoaded(c);
    const { form } = c.getSnapshot();
    expect(form.values).toMatchObject({
      id: 1,
      title: "a",
      subtitle: "s",
      notes: "default note",
    });
    expect(form.isDirty).toBe(false);
    expect(form.isTouched).toBe(false);
    expect(form.isDefaultValue).toBe(true);
    c.destroy();
  });

  it("first record arrival into a TOUCHED form hydrates clean fields, keeps typed values, and cannot wipe on save", async () => {
    const ctx = makeCtx();
    const realGetOne = ctx.dataProvider.getOne.bind(ctx.dataProvider);
    let releaseRecord: (() => void) | undefined;
    vi.spyOn(ctx.dataProvider, "getOne").mockImplementation(
      async (resource, params) => {
        // Only the FIRST fetch is deferred — the post-save invalidation refetch
        // must flow through, or submit() would await it forever.
        if (releaseRecord === undefined) {
          await new Promise<void>((resolve) => {
            releaseRecord = resolve;
          });
        }
        return realGetOne(resource, params);
      },
    );
    const update = vi.spyOn(ctx.dataProvider, "update");
    const c = createEditFormController(ctx, "posts", { id: 1 });
    c.subscribe(() => {});

    // The user types BEFORE the record arrives (slow fetch).
    const title = new FieldApi({ form: c.form, name: "title" });
    title.mount();
    title.handleChange("typed");
    expect(c.getSnapshot().record).toBeUndefined();

    // The fetch starts asynchronously after subscribe — wait for the provider
    // call before releasing the record.
    await vi.waitFor(() => expect(releaseRecord).toBeDefined());
    releaseRecord?.();
    await recordLoaded(c);
    const { form } = c.getSnapshot();
    // Dirty value survives; CLEAN fields hydrate from the server record.
    expect(form.values.title).toBe("typed");
    expect(form.values.subtitle).toBe("s");
    expect(form.values.id).toBe(1);
    // The dirty signal survives the partial apply (a later same-id refetch
    // must take the touched path, not silently rebaseline over the values).
    expect(form.fieldMeta.title?.isDirty).toBe(true);
    expect(form.isTouched).toBe(true);
    expect(form.isDefaultValue).toBe(false);

    // The save payload carries the hydrated record fields, NOT construction
    // defaults — the data-wipe shape is impossible.
    await c.submit();
    const payload = update.mock.calls[0]?.[1]?.data as Record<string, unknown>;
    expect(payload.title).toBe("typed");
    expect(payload.subtitle).toBe("s");
    c.destroy();
  });

  it("keeps the user's dirty values on a same-id refetch (soft path)", async () => {
    const ctx = makeCtx();
    const c = createEditFormController(ctx, "posts", { id: 1 });
    c.subscribe(() => {});
    await recordLoaded(c);
    const title = new FieldApi({ form: c.form, name: "title" });
    title.mount();
    title.handleChange("typed");

    vi.spyOn(ctx.dataProvider, "getOne").mockResolvedValue({
      data: { id: 1, title: "server-v2", subtitle: "s" },
    });
    await ctx.queryClient.invalidateQueries();
    await vi.waitFor(() =>
      expect(c.getSnapshot().record).toMatchObject({ title: "server-v2" }),
    );
    expect(c.getSnapshot().form.values.title).toBe("typed");
    c.destroy();
  });

  it("save success reconciles the form with SERVER truth (reset + isDefaultValue) and keeps default notify + redirect", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const realUpdate = ctx.dataProvider.update.bind(ctx.dataProvider);
    vi.spyOn(ctx.dataProvider, "update").mockImplementation(
      async (resource, params) =>
        realUpdate(resource, {
          ...params,
          data: { ...params.data, title: `${params.data.title}-server` },
        }),
    );
    const c = createEditFormController(ctx, "posts", { id: 1, onRedirect });
    c.subscribe(() => {});
    await recordLoaded(c);
    const title = new FieldApi({ form: c.form, name: "title" });
    title.mount();
    title.handleChange("draft");

    await c.submit();
    const { form } = c.getSnapshot();
    expect(form.values.title).toBe("draft-server");
    expect(form.isDefaultValue).toBe(true);
    expect(form.isDirty).toBe(false);
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.updated" &&
            n.type === "success",
        ),
    ).toBe(true);
    expect(onRedirect).toHaveBeenCalledWith(
      "list",
      "posts",
      1,
      expect.objectContaining({ title: "draft-server" }),
    );
    c.destroy();
  });

  it("composed onSuccess receives the SERVER record and does NOT replace the default notify", async () => {
    const ctx = makeCtx();
    const onSuccess = vi.fn();
    const c = createEditFormController(ctx, "posts", { id: 1, onSuccess });
    c.subscribe(() => {});
    await recordLoaded(c);
    await c.submit();
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: "a" }),
    );
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "chelone.notification.updated"),
    ).toBe(true);
    c.destroy();
  });

  it("resetOnSuccess: false skips the server-truth reset (form stays non-default)", async () => {
    const ctx = makeCtx();
    const c = createEditFormController(ctx, "posts", {
      id: 1,
      resetOnSuccess: false,
    });
    c.subscribe(() => {});
    await recordLoaded(c);
    const title = new FieldApi({ form: c.form, name: "title" });
    title.mount();
    title.handleChange("draft");
    await c.submit();
    expect(c.getSnapshot().form.values.title).toBe("draft");
    expect(c.getSnapshot().form.isDefaultValue).toBe(false);
    c.destroy();
  });

  it("server ValidationError lands on fields via the onSubmit channel; root notifies; saving settles", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "update").mockRejectedValue(
      new ValidationError("invalid", {
        root: "server says no",
        title: "bad title",
      }),
    );
    const c = createEditFormController(ctx, "posts", { id: 1 });
    c.subscribe(() => {});
    await recordLoaded(c);
    const title = new FieldApi({ form: c.form, name: "title" });
    title.mount();
    await c.submit();
    expect(title.state.meta.errors).toContain("bad title");
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "server says no" && n.type === "error"),
    ).toBe(true);
    expect(c.getSnapshot().saving).toBe(false);
    c.destroy();
  });

  it("sanitizeEmptyValues uses the FETCHED record as baseline", async () => {
    const ctx = makeCtx();
    const update = vi.spyOn(ctx.dataProvider, "update");
    const c = createEditFormController(ctx, "posts", {
      id: 1,
      sanitizeEmptyValues: true,
      defaultValues: { notes: "" },
    });
    c.subscribe(() => {});
    await recordLoaded(c);
    const subtitle = new FieldApi({ form: c.form, name: "subtitle" });
    subtitle.mount();
    subtitle.handleChange("");
    await c.submit();
    const payload = update.mock.calls[0]?.[1]?.data as Record<string, unknown>;
    expect(payload.subtitle).toBeNull();
    expect("notes" in payload).toBe(false);
    c.destroy();
  });

  it("an invalid submit (options.schema) blocks the mutation and notifies invalid_form via ctx", async () => {
    const ctx = makeCtx();
    const update = vi.spyOn(ctx.dataProvider, "update");
    const c = createEditFormController(ctx, "posts", {
      id: 1,
      schema: z.object({ title: z.string().min(3) }),
    });
    c.subscribe(() => {});
    await recordLoaded(c);
    await c.submit();
    expect(update).not.toHaveBeenCalled();
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.message.invalid_form" && n.type === "error",
        ),
    ).toBe(true);
    c.destroy();
  });

  it("D6: the registry zod schema is the DEFAULT validator when the context carries resources", async () => {
    const strictResources = defineResources({
      posts: {
        schema: z.object({
          id: z.number(),
          title: z.string().min(3),
          subtitle: z.string().nullable().optional(),
          notes: z.string().optional(),
        }),
      },
    });
    const ctx = { ...makeCtx(), resources: strictResources };
    const update = vi.spyOn(ctx.dataProvider, "update");
    const c = createEditFormController(ctx, "posts", { id: 1 });
    c.subscribe(() => {});
    await recordLoaded(c);
    await c.submit(); // record title "a" violates min(3)
    expect(update).not.toHaveBeenCalled();
    expect(
      ctx.notifications
        .getSnapshot()
        .some((n) => n.message === "chelone.message.invalid_form"),
    ).toBe(true);
    c.destroy();
  });

  it("destroy while attached tears down BOTH controllers; subscribe after destroy is a no-op", async () => {
    const ctx = makeCtx();
    const c = createEditFormController(ctx, "posts", { id: 1 });
    c.subscribe(() => {});
    await recordLoaded(c);
    c.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
    const listener = vi.fn();
    const unsub = c.subscribe(listener);
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(() => unsub()).not.toThrow();
  });
});

describe("createCreateFormController", () => {
  it("merges defaultValues under the seed record (seed wins)", () => {
    const ctx = makeCtx();
    const c = createCreateFormController(ctx, "posts", {
      defaultValues: { title: "d", notes: "n" },
      record: { title: "seed" },
    });
    expect(c.getSnapshot().form.values).toEqual({ title: "seed", notes: "n" });
    c.destroy();
  });

  it("save success: created notify + edit redirect + reset to the CREATED record (server id)", async () => {
    const ctx = makeCtx();
    const onRedirect = vi.fn();
    const c = createCreateFormController(ctx, "posts", {
      record: { title: "brand new" },
      onRedirect,
    });
    c.subscribe(() => {});
    await c.submit();
    const { form } = c.getSnapshot();
    expect(form.values.title).toBe("brand new");
    expect(form.values.id).toBeDefined();
    expect(form.isDefaultValue).toBe(true);
    expect(
      ctx.notifications
        .getSnapshot()
        .some(
          (n) =>
            n.message === "chelone.notification.created" &&
            n.type === "success",
        ),
    ).toBe(true);
    expect(onRedirect).toHaveBeenCalledWith(
      "edit",
      "posts",
      form.values.id,
      expect.objectContaining({ title: "brand new" }),
    );
    c.destroy();
  });

  it("server ValidationError on create lands on mounted fields", async () => {
    const ctx = makeCtx();
    vi.spyOn(ctx.dataProvider, "create").mockRejectedValue(
      new ValidationError("invalid", { title: "taken" }),
    );
    const c = createCreateFormController(ctx, "posts", {
      record: { title: "x" },
    });
    c.subscribe(() => {});
    const title = new FieldApi({ form: c.form, name: "title" });
    title.mount();
    await c.submit();
    expect(title.state.meta.errors).toContain("taken");
    c.destroy();
  });

  it("sanitize baseline is the SEED record", async () => {
    const ctx = makeCtx();
    const create = vi.spyOn(ctx.dataProvider, "create");
    const c = createCreateFormController(ctx, "posts", {
      sanitizeEmptyValues: true,
      record: { title: "seed", subtitle: "" },
      defaultValues: { notes: "" },
    });
    c.subscribe(() => {});
    await c.submit();
    const payload = create.mock.calls[0]?.[1]?.data as Record<string, unknown>;
    expect(payload).toEqual({ title: "seed", subtitle: null });
    c.destroy();
  });

  it("construction is inert and destroy is idempotent", () => {
    const ctx = makeCtx();
    const create = vi.spyOn(ctx.dataProvider, "create");
    const c = createCreateFormController(ctx, "posts", {});
    const detach = c.subscribe(() => {});
    detach();
    c.destroy();
    c.destroy();
    expect(create).not.toHaveBeenCalled();
  });
});
