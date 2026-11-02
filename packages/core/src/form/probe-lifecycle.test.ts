/**
 * P5 ADVERSARIAL LIFECYCLE PROBE (core substrate).
 *
 * Fresh-eyes attack on the SHIPPED vanilla controllers/bindings — the layer
 * where leaks actually live (the React gate suite in
 * `packages/react/src/p5-gate.test.tsx` covers the bridge; this hammers the
 * substrate the bridge sits on). Angles that go BEYOND the gate:
 *
 *  A. 50x attach/detach churn with ASYNC validation IN FLIGHT at the moment of
 *     detach — the gate churns 50x but never with a parked validator; here we
 *     assert every cycle's AbortController fires and no timer/instance/listener
 *     survives across 50 cycles.
 *  B. Post-destroy no-ops for EVERY controller: form, field, array, choices,
 *     composed edit + create. Gate only covers form + field. Assert subscribe
 *     after destroy is inert, and every mutating action is a safe no-op.
 *  C. Composed edit-form FULL lifecycle under discard churn (the vanilla
 *     analogue of "Suspense discards the render"): construct -> never attach
 *     -> destroy leaks nothing; attach -> detach -> re-attach -> destroy is
 *     clean; the hydration listener dies with the record store.
 *  D. Detached mutations: setFieldValue / array ops / choices.setValue while
 *     DETACHED mutate in-memory state but mount/observe/time NOTHING.
 *  E. Debounce timers after detach: choices.setFilters(x, true) then detach
 *     must clear the pending timer (no post-detach applyFilters, no zombie
 *     setOptions).
 *  F. Overlapping submits: two submit() calls racing never double-reset,
 *     never reject, never leak an error channel.
 *
 * Leak gauges (probed on form-core 1.33.0, mirrored from the gate):
 *  - devtools listeners: `form.mount()` adds 3 `form-devtools:`-typed window
 *    listeners; unmount removes 3. net == 3 * mounted-forms.
 *  - field instances: `field.mount()` sets `form.fieldInfo[name].instance`;
 *    unmount nulls it.
 *  - abort controllers: in-flight async validation lives in
 *    `fieldInfo[name].validationMetaMap[cause].lastAbortController`.
 *  - field timers: pending debounce/async timers in `field.timeoutIds`.
 */
import { QueryClient } from "@tanstack/query-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import { createNotificationStore } from "../notification/notification-store";
import { defineResources } from "../resource/registry";
import { createStore } from "../store/store";
import { createArrayBinding } from "./array-binding";
import { createChoicesController } from "./choices-controller";
import {
  createCreateFormController,
  createEditFormController,
  type FormControllerContext,
} from "./edit-create-form";
import { type CheloneFormApi, createFormController } from "./form-controller";
import { createFieldBinding } from "./input-binding";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string() }),
  },
});
const rows = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// --- leak gauges -----------------------------------------------------------

/**
 * `form.mount()` registers 3 `form-devtools:` window listeners WHEN a `window`
 * exists (jsdom); in a pure node env (this core suite) the devtools bus no-ops
 * and registers 0 (ground truth #9). The per-mounted-form expectation adapts
 * so the same probe body asserts the correct count in either environment — the
 * real leak signal here is carried by the field-instance + observer gauges
 * (which need no `window`); the `window` devtools gauge is exercised in the
 * jsdom React gate.
 */
const LISTENERS_PER_MOUNT = (globalThis as { window?: unknown }).window ? 3 : 0;

function trackDevtoolsListeners() {
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target) return { net: () => 0 };
  const added = vi.spyOn(target, "addEventListener");
  const removed = vi.spyOn(target, "removeEventListener");
  const count = (spy: typeof added) =>
    spy.mock.calls.filter(([type]) => String(type).startsWith("form-devtools:"))
      .length;
  return { net: () => count(added) - count(removed) };
}

interface FieldInfoView {
  instance: object | null;
  validationMetaMap: Record<
    string,
    { lastAbortController: AbortController } | undefined
  >;
}
interface FieldTimeoutsView {
  timeoutIds: Record<string, Record<string, unknown>>;
}

function fieldInfoMap(form: object): Record<string, FieldInfoView | undefined> {
  return (form as { fieldInfo: Record<string, FieldInfoView | undefined> })
    .fieldInfo;
}

function liveFieldInstances(form: object): number {
  return Object.values(fieldInfoMap(form)).filter(
    (info) => info?.instance != null,
  ).length;
}

function abortControllersOf(form: object, source: string): AbortController[] {
  const info = fieldInfoMap(form)[source];
  if (!info) return [];
  return Object.values(info.validationMetaMap)
    .filter((meta) => meta !== undefined)
    .map((meta) => meta.lastAbortController);
}

function pendingFieldTimers(field: object): number {
  const { timeoutIds } = field as unknown as FieldTimeoutsView;
  return Object.values(timeoutIds)
    .flatMap((group) => Object.values(group))
    .filter((t) => t != null).length;
}

function observerCount(queryClient: QueryClient): number {
  return queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);
}

const noop = (): void => {};

/** A controllable async validator: each call parks until its resolver fires. */
function makeAsyncValidator() {
  const resolvers: Array<(error: string | undefined) => void> = [];
  const validator = vi.fn(
    () =>
      new Promise<string | undefined>((resolve) => {
        resolvers.push(resolve);
      }),
  );
  return { validator, resolvers };
}

function makeCtx(): FormControllerContext<typeof resources> & {
  queryClient: QueryClient;
  notifications: ReturnType<typeof createNotificationStore>;
} {
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const notifications = createNotificationStore();
  return {
    dataProvider,
    queryClient,
    store: createStore(),
    notifications,
    resources,
  };
}

// ===========================================================================
// A. 50x churn with async validation in flight at the moment of detach
// ===========================================================================

describe("probe A: churn with async validation in flight", () => {
  it("50x attach -> park async validation -> detach: every cycle aborts, clears timers, releases the instance, zero drift", async () => {
    const devtools = trackDevtoolsListeners();
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "v0" },
      save: async () => undefined,
    });
    const form = controller.form;
    const { validator, resolvers } = makeAsyncValidator();
    const binding = createFieldBinding(
      form as CheloneFormApi<{ title: string }>,
      { source: "title", validate: validator },
    );

    for (let i = 0; i < 50; i++) {
      const offForm = controller.subscribe(noop);
      const offField = binding.subscribe(noop);
      expect(devtools.net(), `cycle ${i}: attached`).toBe(LISTENERS_PER_MOUNT);
      expect(liveFieldInstances(form), `cycle ${i}: field live`).toBe(1);

      // Kick async validation into flight: change latches the async slot, a
      // submit forces the validator to run and park.
      binding.setValue(`v${i}`);
      const submit = controller.submit();
      await vi.waitFor(
        () => expect(validator.mock.calls.length).toBeGreaterThan(i),
        { interval: 5 },
      );
      const controllers = abortControllersOf(form, "title");
      expect(controllers.length, `cycle ${i}: parked`).toBeGreaterThanOrEqual(
        1,
      );
      expect(controllers.some((c) => c.signal.aborted)).toBe(false);

      // DETACH mid-flight: field unmounts -> abort fires, timers clear.
      offField();
      expect(
        controllers.every((c) => c.signal.aborted),
        `cycle ${i}: aborted`,
      ).toBe(true);
      expect(
        abortControllersOf(form, "title"),
        `cycle ${i}: meta cleared`,
      ).toHaveLength(0);
      expect(pendingFieldTimers(binding.field), `cycle ${i}: timers`).toBe(0);
      expect(liveFieldInstances(form), `cycle ${i}: field released`).toBe(0);

      offForm();
      expect(devtools.net(), `cycle ${i}: fully detached`).toBe(0);

      // Release the parked validator AFTER detach — the late result must be
      // swallowed (no throw, no error channel resurrection). Every parked
      // call is released: a cycle can park more than one, and a call left
      // parked would leave `await submit` waiting on it.
      for (const release of resolvers.splice(0)) release("late-error");
      await submit;
      expect(resolvers, `cycle ${i}: nothing left parked`).toHaveLength(0);
    }

    // No accumulated instances / listeners / timers after 50 cycles.
    expect(devtools.net()).toBe(0);
    expect(liveFieldInstances(form)).toBe(0);
    expect(pendingFieldTimers(binding.field)).toBe(0);

    binding.destroy();
    controller.destroy();
    expect(devtools.net()).toBe(0);
  });
});

// ===========================================================================
// B. Post-destroy no-ops for every controller
// ===========================================================================

describe("probe B: post-destroy no-ops", () => {
  it("form controller: destroy releases; subscribe/submit after destroy are inert", async () => {
    const devtools = trackDevtoolsListeners();
    const save = vi.fn(async () => undefined);
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "x" },
      save,
    });
    const off = controller.subscribe(noop);
    expect(devtools.net()).toBe(LISTENERS_PER_MOUNT);
    controller.destroy();
    expect(devtools.net()).toBe(0);
    controller.destroy(); // idempotent
    off(); // stale unsub after destroy: inert

    // subscribe after destroy: no re-attach, no mount.
    const off2 = controller.subscribe(noop);
    expect(devtools.net()).toBe(0);
    off2();
    // submit after destroy: no save, no throw.
    await controller.submit();
    expect(save).not.toHaveBeenCalled();
    expect(devtools.net()).toBe(0);
  });

  it("field binding: destroy releases; subscribe after destroy never registers an instance", () => {
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "x" },
      save: async () => undefined,
    });
    const form = controller.form;
    const binding = createFieldBinding(
      form as CheloneFormApi<{ title: string }>,
      { source: "title" },
    );
    const off = binding.subscribe(noop);
    expect(liveFieldInstances(form)).toBe(1);
    binding.destroy();
    expect(liveFieldInstances(form)).toBe(0);
    binding.destroy(); // idempotent
    off();

    const off2 = binding.subscribe(noop);
    expect(liveFieldInstances(form)).toBe(0);
    off2();
    // update / setValue after destroy: no throw, no mount.
    binding.update({ defaultValue: "z" });
    binding.setValue("after-destroy");
    expect(liveFieldInstances(form)).toBe(0);
    controller.destroy();
  });

  it("array binding: destroy releases the array field; ops after destroy never mount", () => {
    const controller = createFormController<{ tags: string[] }>({
      defaultValues: { tags: ["a"] },
      save: async () => undefined,
    });
    const form = controller.form;
    const binding = createArrayBinding(
      form as CheloneFormApi<{ tags: string[] }>,
      { source: "tags", scalar: true },
    );
    const off = binding.subscribe(noop);
    expect(liveFieldInstances(form)).toBe(1);
    binding.destroy();
    expect(liveFieldInstances(form)).toBe(0);
    binding.destroy(); // idempotent
    off();

    const off2 = binding.subscribe(noop);
    expect(liveFieldInstances(form)).toBe(0);
    off2();
    // ops after destroy: mutate in-memory (allowed) but never re-mount.
    binding.add("b");
    binding.clear();
    expect(liveFieldInstances(form)).toBe(0);
    controller.destroy();
  });

  it("choices controller: destroy releases both observers; every action is a no-op after destroy", async () => {
    const ctx = makeCtx();
    const controller = createChoicesController(ctx, { reference: "posts" });
    const off = controller.subscribe(noop);
    await vi.waitFor(() =>
      expect(controller.getSnapshot().isPending).toBe(false),
    );
    expect(observerCount(ctx.queryClient)).toBe(2); // choices + selected
    controller.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
    controller.destroy(); // idempotent
    off();

    // subscribe after destroy: no observers re-created.
    const off2 = controller.subscribe(noop);
    expect(observerCount(ctx.queryClient)).toBe(0);
    off2();
    // Every action after destroy: no throw, no observer, no fetch.
    controller.setPage(2);
    controller.setPerPage(50);
    controller.setSort({ field: "title", order: "ASC" });
    controller.setFilters({ q: "z" }, true);
    controller.setValue([1, 2]);
    controller.refetch();
    await vi.waitFor(() => expect(observerCount(ctx.queryClient)).toBe(0));
    expect(observerCount(ctx.queryClient)).toBe(0);
  });

  it("composed edit-form controller: destroy releases form + record observers; post-destroy subscribe/submit inert", async () => {
    const devtools = trackDevtoolsListeners();
    const ctx = makeCtx();
    const update = vi.spyOn(ctx.dataProvider, "update");
    const controller = createEditFormController<typeof resources, "posts">(
      ctx,
      "posts",
      { id: 1 },
    );
    const off = controller.subscribe(noop);
    await vi.waitFor(() =>
      expect(controller.getSnapshot().record).toBeDefined(),
    );
    expect(observerCount(ctx.queryClient)).toBe(1);
    expect(devtools.net()).toBe(LISTENERS_PER_MOUNT);
    controller.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
    controller.destroy(); // idempotent
    off();

    const off2 = controller.subscribe(noop);
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
    off2();
    // submit after destroy: the form controller short-circuits; no mutation.
    await controller.submit();
    expect(update).not.toHaveBeenCalled();
    expect(devtools.net()).toBe(0);
  });

  it("composed create-form controller: destroy releases; post-destroy inert", async () => {
    const devtools = trackDevtoolsListeners();
    const ctx = makeCtx();
    const create = vi.spyOn(ctx.dataProvider, "create");
    const controller = createCreateFormController<typeof resources, "posts">(
      ctx,
      "posts",
      { defaultValues: { title: "new" } },
    );
    const off = controller.subscribe(noop);
    expect(devtools.net()).toBe(LISTENERS_PER_MOUNT);
    controller.destroy();
    expect(devtools.net()).toBe(0);
    off();
    const off2 = controller.subscribe(noop);
    expect(devtools.net()).toBe(0);
    off2();
    await controller.submit();
    expect(create).not.toHaveBeenCalled();
    expect(devtools.net()).toBe(0);
  });
});

// ===========================================================================
// C. Composed edit-form full lifecycle under discard churn
// ===========================================================================

describe("probe C: composed edit-form lifecycle churn", () => {
  it("construct -> never attach -> destroy: no fetch, no observer, no mount, no listeners", async () => {
    const devtools = trackDevtoolsListeners();
    const ctx = makeCtx();
    const getOne = vi.spyOn(ctx.dataProvider, "getOne");
    const controller = createEditFormController<typeof resources, "posts">(
      ctx,
      "posts",
      { id: 1 },
    );
    // Never subscribed — the vanilla analogue of a discarded React render.
    await Promise.resolve();
    expect(getOne).not.toHaveBeenCalled();
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
    controller.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
  });

  it("20x attach -> detach -> re-attach of the composed controller: observers + listeners return to baseline every cycle", async () => {
    const devtools = trackDevtoolsListeners();
    const ctx = makeCtx();
    const controller = createEditFormController<typeof resources, "posts">(
      ctx,
      "posts",
      { id: 1 },
    );

    for (let i = 0; i < 20; i++) {
      const off = controller.subscribe(noop);
      await vi.waitFor(() =>
        expect(controller.getSnapshot().record).toBeDefined(),
      );
      expect(observerCount(ctx.queryClient), `cycle ${i}: attached`).toBe(1);
      expect(devtools.net(), `cycle ${i}: attached listeners`).toBe(
        LISTENERS_PER_MOUNT,
      );
      // Record hydrated into an untouched form without dirtying.
      expect(controller.form.state.values.title, `cycle ${i}`).toBe("t1");
      expect(controller.getSnapshot().form.isDirty, `cycle ${i}: clean`).toBe(
        false,
      );

      off();
      expect(observerCount(ctx.queryClient), `cycle ${i}: detached`).toBe(0);
      expect(devtools.net(), `cycle ${i}: detached listeners`).toBe(0);
    }

    controller.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
  });

  it("attach with a field binding, edit, detach, re-attach: the composed controller re-hydrates and the field survives", async () => {
    const ctx = makeCtx();
    const controller = createEditFormController<typeof resources, "posts">(
      ctx,
      "posts",
      { id: 1 },
    );
    const form = controller.form as CheloneFormApi<{
      id: number;
      title: string;
    }>;
    const binding = createFieldBinding(form, { source: "title" });

    const offC = controller.subscribe(noop);
    const offF = binding.subscribe(noop);
    await vi.waitFor(() =>
      expect(controller.getSnapshot().record).toBeDefined(),
    );
    expect(liveFieldInstances(form)).toBe(1);
    expect(binding.getValue()).toBe("t1");

    // Detach both, then re-attach — no leak, field re-registers, value stays.
    offF();
    offC();
    expect(liveFieldInstances(form)).toBe(0);
    expect(observerCount(ctx.queryClient)).toBe(0);

    const offC2 = controller.subscribe(noop);
    const offF2 = binding.subscribe(noop);
    await vi.waitFor(() =>
      expect(controller.getSnapshot().record).toBeDefined(),
    );
    expect(liveFieldInstances(form)).toBe(1);
    expect(binding.getValue()).toBe("t1");

    offF2();
    offC2();
    binding.destroy();
    controller.destroy();
    expect(liveFieldInstances(form)).toBe(0);
    expect(observerCount(ctx.queryClient)).toBe(0);
  });
});

// ===========================================================================
// D. Detached mutations
// ===========================================================================

describe("probe D: detached mutations mount/observe/time nothing", () => {
  it("field.setValue while detached mutates form values but never mounts an instance", () => {
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "x" },
      save: async () => undefined,
    });
    const form = controller.form;
    const binding = createFieldBinding(
      form as CheloneFormApi<{ title: string }>,
      { source: "title" },
    );
    // Never subscribed.
    binding.setValue("detached-write");
    expect(form.getFieldValue("title")).toBe("detached-write"); // allowed
    expect(liveFieldInstances(form)).toBe(0); // nothing mounted
    binding.destroy();
    controller.destroy();
  });

  it("array ops while detached mutate the array but never mount the array field", () => {
    const controller = createFormController<{ tags: string[] }>({
      defaultValues: { tags: [] },
      save: async () => undefined,
    });
    const form = controller.form;
    const binding = createArrayBinding(
      form as CheloneFormApi<{ tags: string[] }>,
      { source: "tags", scalar: true },
    );
    // Never subscribed.
    binding.add("a");
    binding.add("b");
    expect(form.getFieldValue("tags")).toEqual(["a", "b"]); // allowed
    expect(binding.getTotal()).toBe(2);
    expect(liveFieldInstances(form)).toBe(0); // nothing mounted
    binding.destroy();
    controller.destroy();
  });

  it("choices.setValue while detached updates the snapshot but creates no observer", async () => {
    const ctx = makeCtx();
    const controller = createChoicesController(ctx, { reference: "posts" });
    // Never subscribed.
    controller.setValue([1]);
    await Promise.resolve();
    expect(observerCount(ctx.queryClient)).toBe(0); // no observer created
    // Clearing detached drops stale selected immediately.
    controller.setValue(null);
    expect(controller.getSnapshot().selectedChoices).toEqual([]);
    expect(observerCount(ctx.queryClient)).toBe(0);
    controller.destroy();
  });
});

// ===========================================================================
// E. Debounce timers after detach
// ===========================================================================

describe("probe E: debounce timers cleared on detach", () => {
  it("choices.setFilters(x, true) then detach clears the pending timer — no post-detach applyFilters, no zombie fetch", async () => {
    vi.useFakeTimers();
    const ctx = makeCtx();
    const controller = createChoicesController(ctx, {
      reference: "posts",
      debounceMs: 500,
    });
    const off = controller.subscribe(noop);
    await vi.waitFor(() =>
      expect(controller.getSnapshot().isPending).toBe(false),
    );
    const filterBefore = controller.getSnapshot().filter;

    // Schedule a debounced filter, then detach BEFORE the timer fires.
    controller.setFilters({ q: "zzz" }, true);
    off();
    expect(observerCount(ctx.queryClient)).toBe(0); // detached, observers gone

    // Advance past the debounce window: the cleared timer must NOT fire.
    await vi.advanceTimersByTimeAsync(1000);
    expect(controller.getSnapshot().filter).toBe(filterBefore); // unchanged
    expect(observerCount(ctx.queryClient)).toBe(0); // no zombie observer

    controller.destroy();
    expect(observerCount(ctx.queryClient)).toBe(0);
  });

  it("choices debounced setFilters then destroy clears the timer (destroy while attached)", async () => {
    vi.useFakeTimers();
    const ctx = makeCtx();
    const controller = createChoicesController(ctx, {
      reference: "posts",
      debounceMs: 500,
    });
    const off = controller.subscribe(noop);
    await vi.waitFor(() =>
      expect(controller.getSnapshot().isPending).toBe(false),
    );
    const filterBefore = controller.getSnapshot().filter;
    controller.setFilters({ q: "later" }, true);
    controller.destroy(); // destroy while the timer is pending
    off();
    await vi.advanceTimersByTimeAsync(1000);
    // Destroyed store's setState is inert, and the timer was cleared anyway.
    expect(controller.getSnapshot().filter).toBe(filterBefore);
    expect(observerCount(ctx.queryClient)).toBe(0);
  });
});

// ===========================================================================
// F. Overlapping submits
// ===========================================================================

describe("probe F: overlapping submits", () => {
  it("two overlapping submits with a slow save: never reject, exactly one reset baseline, no leaked error channel", async () => {
    let releaseSave!: () => void;
    const savedRecords: unknown[] = [];
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "start" },
      save: (data) => {
        savedRecords.push(data);
        return new Promise<undefined>((resolve) => {
          releaseSave = () => resolve(undefined);
        });
      },
    });
    const off = controller.subscribe(noop);
    controller.form.setFieldValue("title", "edited");

    // Fire two submits back-to-back before the first save resolves.
    const s1 = controller.submit();
    const s2 = controller.submit();
    await vi.waitFor(() => expect(savedRecords.length).toBeGreaterThan(0));
    releaseSave();
    // Neither promise rejects.
    await expect(Promise.allSettled([s1, s2])).resolves.toEqual([
      { status: "fulfilled", value: undefined },
      { status: "fulfilled", value: undefined },
    ]);
    // Reset landed: the form is rebaselined on the submitted values, clean.
    expect(controller.form.state.values.title).toBe("edited");
    expect(controller.form.state.isDefaultValue).toBe(true);
    off();
    controller.destroy();
  });

  it("overlapping submits where the server returns fieldErrors: the error channel is set, not duplicated, and clears on edit", async () => {
    const ctx = makeCtx();
    const save = vi.fn(
      async (): Promise<Record<string, string> | undefined> => ({
        title: "server rejected",
      }),
    );
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "start" },
      save,
      notifications: ctx.notifications,
    });
    const off = controller.subscribe(noop);
    const binding = createFieldBinding(
      controller.form as CheloneFormApi<{ title: string }>,
      { source: "title" },
    );
    const offF = binding.subscribe(noop);
    controller.form.setFieldValue("title", "edited");

    await controller.submit();
    await controller.submit();
    // The server error landed on the title field's onSubmit channel.
    const errorMap = controller.form.state.fieldMeta.title?.errorMap as
      | Record<string, unknown>
      | undefined;
    expect(errorMap?.onSubmit).toBe("server rejected");

    // Editing the field clears the server error (auto-clear on passing change).
    binding.setValue("fixed");
    await vi.waitFor(() => {
      const map = controller.form.state.fieldMeta.title?.errorMap as
        | Record<string, unknown>
        | undefined;
      expect(map?.onSubmit == null).toBe(true);
    });

    offF();
    off();
    binding.destroy();
    controller.destroy();
  });
});
