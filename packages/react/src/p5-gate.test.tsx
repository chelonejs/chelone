/**
 * P5 PATTERN GATE — adversarial lifecycle attack on the T1-T4 form binding
 * (same protocol as the P4 Task-4R gate). Attacks, empirically:
 *
 * 1. Discarded-render leaks: Suspense sibling suspending during initial
 *    mount, a render throwing AFTER lazy init, initial-hidden <Activity> —
 *    across useForm, useEditForm AND useInput. Asserts zero mounted
 *    FormApis/FieldApis (no registered field instances, no devtools
 *    listeners), zero live QueryObservers from composed controllers, zero
 *    KV writes.
 * 2. StrictMode mount->cleanup->remount: values/meta survive, onMount
 *    validators run once per mount (probed: revalidateLogic does not
 *    suppress them), no double side effects.
 * 3. Activity-style detach/re-attach: unmount-less detach aborts in-flight
 *    async validation (the field's AbortController fires), re-attach
 *    revalidates, values survive.
 * 4. Zombie writes: a never-committed instance never mounts and never
 *    writes (KV, query cache, notifications, network).
 *
 * Every scenario is churned (loops) to smoke out refcount drift.
 *
 * Leak observability (probed on form-core 1.33.0):
 * - `form.mount()` registers exactly THREE window listeners, all with
 *   `form-devtools:`-prefixed event types; its cleanup removes all three.
 *   Net `form-devtools:` listeners == 3 x currently-mounted forms.
 * - `field.mount()` sets `form.fieldInfo[name].instance`; unmount nulls it
 *   and clears every debounce timer in `field.timeoutIds`.
 * - In-flight async validation lives in
 *   `fieldInfo[name].validationMetaMap[cause].lastAbortController`; field
 *   unmount aborts it and clears the map.
 */
import {
  type CheloneFormApi,
  createFieldBinding,
  createFormController,
  createNotificationStore,
  createStore,
  defineResources,
  type FieldErrors,
  fakeDataProvider,
  noop,
} from "@chelone/core";
import type { AnyFieldApi } from "@tanstack/form-core";
import { QueryClient } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import {
  Activity,
  Component,
  type ReactNode,
  StrictMode,
  Suspense,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import { CheloneFormProvider } from "./form-context";
import {
  type UseEditFormResult,
  type UseFormResult,
  type UseInputResult,
  useEditForm,
  useForm,
  useInput,
} from "./form-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
const rows = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * NOTE (gate discovery, probed on React 19): `<StrictMode>` only
 * double-invokes effects (the mount->cleanup->remount simulation) when it is
 * the ROOT element passed to `render()`. A StrictMode nested inside a
 * wrapper component — or under any host element — double-RENDERS but does
 * NOT re-run effects, silently making remount assertions vacuous. StrictMode
 * tests below therefore wrap at the render() call site:
 * `render(<StrictMode><Wrapper>...</Wrapper></StrictMode>)`.
 */
function makeWrapper() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const getOne = vi.spyOn(dataProvider, "getOne");
  const update = vi.spyOn(dataProvider, "update");
  const store = createStore();
  const setItem = vi.spyOn(store, "setItem");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  return {
    wrapper,
    notifications,
    queryClient,
    dataProvider,
    getOne,
    update,
    store,
    setItem,
  };
}

/** Live QueryObserver subscriptions across the whole cache. */
function observerCount(queryClient: QueryClient): number {
  return queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);
}

/**
 * Net `form-devtools:` window listeners since this tracker was installed —
 * form-core's `form.mount()` adds exactly 3, its unmount cleanup removes 3,
 * so `net() === 3 * <currently mounted forms>`.
 */
function trackDevtoolsListeners() {
  const added = vi.spyOn(window, "addEventListener");
  const removed = vi.spyOn(window, "removeEventListener");
  const count = (spy: typeof added) =>
    spy.mock.calls.filter(([type]) => String(type).startsWith("form-devtools:"))
      .length;
  return { net: () => count(added) - count(removed) };
}

/** Structural view of form-core internals the leak assertions need. */
interface FieldInfoView {
  instance: AnyFieldApi | null;
  validationMetaMap: Record<
    string,
    { lastAbortController: AbortController } | undefined
  >;
}

function fieldInfoMap(form: object): Record<string, FieldInfoView | undefined> {
  return (form as { fieldInfo: Record<string, FieldInfoView | undefined> })
    .fieldInfo;
}

/** Registered (mounted) FieldApi instances on a form — the field-leak gauge. */
function liveFieldInstances(form: object): number {
  return Object.values(fieldInfoMap(form)).filter(
    (info) => info?.instance != null,
  ).length;
}

/** The in-flight async-validation AbortControllers of one field. */
function abortControllersOf(form: object, source: string): AbortController[] {
  const info = fieldInfoMap(form)[source];
  if (!info) return [];
  return Object.values(info.validationMetaMap)
    .filter((meta) => meta !== undefined)
    .map((meta) => meta.lastAbortController);
}

/**
 * Pending debounce/listener timers on a FieldApi — must be empty after detach.
 * `Pick`, not `AnyFieldApi`: a `CheloneFieldApi` is not assignable to form-core's
 * all-`any` field type — its `never` submit meta breaks the recursive check.
 */
function pendingFieldTimers(field: Pick<AnyFieldApi, "timeoutIds">): number {
  return Object.values(field.timeoutIds)
    .flatMap((group) => Object.values(group))
    .filter((t) => t != null).length;
}

/** An instrumented `useForm` host: tracks constructions and mounts. */
function makeGateFormHost<TFormData extends object>(options: {
  defaultValues?: TFormData;
  save: (data: TFormData) => Promise<FieldErrors | undefined>;
}) {
  const latestForm: { current: UseFormResult<TFormData> | null } = {
    current: null,
  };
  /** Every FormApi ever constructed through the hook — discarded ones included. */
  const constructedForms = new Set<object>();
  /** The formApi of every `form.mount()` (form-core's listeners.onMount). */
  const mountEvents: object[] = [];
  const onMountValidator = vi.fn(() => undefined);
  function FormHost({ children }: { children?: ReactNode }) {
    const result = useForm<TFormData>({
      ...options,
      formOptions: {
        listeners: {
          onMount: ({ formApi }) => {
            mountEvents.push(formApi);
          },
        },
        validators: { onMount: onMountValidator },
      },
    });
    constructedForms.add(result.form);
    latestForm.current = result;
    return (
      <CheloneFormProvider form={result.form} submit={result.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  return {
    latestForm,
    constructedForms,
    mountEvents,
    onMountValidator,
    FormHost,
  };
}

/** A `useInput` probe capturing the latest result. */
function makeInputProbe(inputOptions: Parameters<typeof useInput>[0]) {
  const latestInput: { current: UseInputResult | null } = { current: null };
  function Input() {
    latestInput.current = useInput(inputOptions);
    return null;
  }
  return { latestInput, Input };
}

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

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// 1. Discarded-render leaks
// ---------------------------------------------------------------------------

describe("P5 gate: discarded-render leaks", () => {
  it("Suspense sibling suspending on initial mount: useForm+useInput leak no mounts, listeners, instances, or KV writes", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, queryClient, setItem } = makeWrapper();
    const save = vi.fn(async () => undefined);
    const host = makeGateFormHost<{ title: string }>({
      defaultValues: { title: "hello" },
      save,
    });
    const { latestInput, Input } = makeInputProbe({ source: "title" });
    let release!: () => void;
    let resolved = false;
    const gate = new Promise<void>((r) => {
      release = () => {
        resolved = true;
        r();
      };
    });
    function Suspender() {
      if (!resolved) throw gate;
      return null;
    }
    const view = render(
      <Wrapper>
        <Suspense fallback={null}>
          <host.FormHost>
            <Input />
          </host.FormHost>
          <Suspender />
        </Suspense>
      </Wrapper>,
    );
    // While suspended nothing may have committed: zero form mounts, zero
    // devtools listeners, zero registered field instances on ANY constructed
    // form (discarded renders are garbage, not zombies).
    expect(host.constructedForms.size).toBeGreaterThanOrEqual(1);
    expect(host.mountEvents).toHaveLength(0);
    expect(host.onMountValidator).not.toHaveBeenCalled();
    expect(devtools.net()).toBe(0);
    for (const form of host.constructedForms) {
      expect(liveFieldInstances(form)).toBe(0);
    }
    expect(observerCount(queryClient)).toBe(0);
    expect(setItem).not.toHaveBeenCalled();

    await act(async () => {
      release();
      await gate;
    });
    await waitFor(() => expect(latestInput.current).not.toBeNull());
    // Exactly ONE live form: every mount event targets the committed form,
    // and only the committed form carries the registered field instance.
    const liveForm = host.latestForm.current?.form as object;
    expect(host.mountEvents).toHaveLength(1);
    expect(host.mountEvents[0]).toBe(liveForm);
    expect(devtools.net()).toBe(3);
    expect(liveFieldInstances(liveForm)).toBe(1);
    for (const form of host.constructedForms) {
      if (form !== liveForm) expect(liveFieldInstances(form)).toBe(0);
    }
    expect(latestInput.current?.field.value).toBe("hello");

    view.unmount();
    expect(devtools.net()).toBe(0);
    expect(liveFieldInstances(liveForm)).toBe(0);
    expect(setItem).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("Suspense sibling suspending on initial mount: useEditForm acquires no observers and fires no fetch until commit", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, queryClient, getOne, setItem } = makeWrapper();
    const latest: {
      current: UseEditFormResult<(typeof rows)[number]> | null;
    } = { current: null };
    const constructedForms = new Set<object>();
    const mountEvents: object[] = [];
    function Probe() {
      const result = useEditForm<typeof resources, "posts">("posts", {
        id: 1,
        formOptions: {
          listeners: {
            onMount: ({ formApi }) => {
              mountEvents.push(formApi);
            },
          },
        },
      });
      constructedForms.add(result.form);
      latest.current = result;
      return null;
    }
    let release!: () => void;
    let resolved = false;
    const gate = new Promise<void>((r) => {
      release = () => {
        resolved = true;
        r();
      };
    });
    function Suspender() {
      if (!resolved) throw gate;
      return null;
    }
    const view = render(
      <Wrapper>
        <Suspense fallback={null}>
          <Probe />
          <Suspender />
        </Suspense>
      </Wrapper>,
    );
    // Suspended: the composed controller (record controller + form) must be
    // fully inert — no fetch, no observers, no form mounts, no KV.
    expect(getOne).not.toHaveBeenCalled();
    expect(observerCount(queryClient)).toBe(0);
    expect(mountEvents).toHaveLength(0);
    expect(devtools.net()).toBe(0);
    expect(setItem).not.toHaveBeenCalled();

    await act(async () => {
      release();
      await gate;
    });
    await waitFor(() => expect(latest.current?.record).toBeDefined());
    // One live composed controller: one getOne observer, one mounted form,
    // record hydrated into the form without dirtying it.
    expect(observerCount(queryClient)).toBe(1);
    expect(getOne).toHaveBeenCalledTimes(1);
    expect(mountEvents).toHaveLength(1);
    expect(mountEvents[0]).toBe(latest.current?.form);
    expect(devtools.net()).toBe(3);
    expect(latest.current?.form.state.values.title).toBe("t1");
    expect(latest.current?.isDirty).toBe(false);
    expect(latest.current?.isDefaultValue).toBe(true);

    view.unmount();
    expect(observerCount(queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("a render throwing AFTER lazy init (useForm+useInput) commits nothing and leaks nothing; a clean mount then works", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const devtools = trackDevtoolsListeners();
      const { wrapper: Wrapper, queryClient, setItem } = makeWrapper();
      const save = vi.fn(async () => undefined);
      const host = makeGateFormHost<{ title: string }>({
        defaultValues: { title: "boom" },
        save,
      });
      const { latestInput, Input } = makeInputProbe({ source: "title" });
      let explode = true;
      function ExplodingInput() {
        // useInput constructs its field binding lazily, THEN the render dies.
        useInput({ source: "title" });
        if (explode) throw new Error("discarded-render");
        return null;
      }
      const view = render(
        <Wrapper>
          <Boundary>
            <host.FormHost>
              <ExplodingInput />
            </host.FormHost>
          </Boundary>
        </Wrapper>,
      );
      await act(async () => {});
      // The whole subtree was discarded: no form mounts, no field instances,
      // no devtools listeners, no KV writes.
      expect(host.constructedForms.size).toBeGreaterThanOrEqual(1);
      expect(host.mountEvents).toHaveLength(0);
      expect(devtools.net()).toBe(0);
      for (const form of host.constructedForms) {
        expect(liveFieldInstances(form)).toBe(0);
      }
      expect(observerCount(queryClient)).toBe(0);
      expect(setItem).not.toHaveBeenCalled();
      view.unmount();
      expect(devtools.net()).toBe(0);

      // A clean mount of the same shape then works.
      explode = false;
      const second = makeWrapper();
      const SecondWrapper = second.wrapper;
      const host2 = makeGateFormHost<{ title: string }>({
        defaultValues: { title: "clean" },
        save,
      });
      const clean = render(
        <SecondWrapper>
          <Boundary>
            <host2.FormHost>
              <Input />
            </host2.FormHost>
          </Boundary>
        </SecondWrapper>,
      );
      await waitFor(() => expect(latestInput.current).not.toBeNull());
      expect(latestInput.current?.field.value).toBe("clean");
      expect(host2.mountEvents).toHaveLength(1);
      clean.unmount();
      expect(devtools.net()).toBe(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("a render throwing AFTER useEditForm's lazy init never fetches, mounts, or writes — and the zombie stays write-inert", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const devtools = trackDevtoolsListeners();
      const {
        wrapper: Wrapper,
        queryClient,
        getOne,
        update,
        setItem,
        notifications,
      } = makeWrapper();
      const zombie: {
        current: UseEditFormResult<(typeof rows)[number]> | null;
      } = { current: null };
      const mountEvents: object[] = [];
      function Exploding(): ReactNode {
        zombie.current = useEditForm<typeof resources, "posts">("posts", {
          id: 1,
          formOptions: {
            listeners: {
              onMount: ({ formApi }) => {
                mountEvents.push(formApi);
              },
            },
          },
        });
        throw new Error("discarded-render");
      }
      const view = render(
        <Wrapper>
          <Boundary>
            <Exploding />
          </Boundary>
        </Wrapper>,
      );
      await act(async () => {});
      expect(zombie.current).not.toBeNull();
      expect(getOne).not.toHaveBeenCalled();
      expect(observerCount(queryClient)).toBe(0);
      expect(mountEvents).toHaveLength(0);
      expect(devtools.net()).toBe(0);

      // ZOMBIE WRITES: imperative value writes on the never-committed
      // instance are allowed (pure in-memory form state) but must mount
      // nothing and write nowhere.
      if (zombie.current === null) {
        throw new Error("gate: useEditForm never produced a result");
      }
      const captured = zombie.current;
      captured.form.setFieldValue("title", "ghost");
      await act(async () => {});
      expect(captured.form.state.values.title).toBe("ghost"); // allowed
      expect(mountEvents).toHaveLength(0); // never mounted
      expect(liveFieldInstances(captured.form)).toBe(0);
      expect(devtools.net()).toBe(0);
      expect(observerCount(queryClient)).toBe(0);
      expect(getOne).not.toHaveBeenCalled(); // no fetch
      expect(update).not.toHaveBeenCalled(); // no mutation
      expect(setItem).not.toHaveBeenCalled(); // no KV
      expect(notifications.getSnapshot()).toHaveLength(0);

      view.unmount();
      expect(devtools.net()).toBe(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("initial-hidden <Activity>: the pre-rendered form+input acquire nothing until reveal", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, queryClient, setItem } = makeWrapper();
    const save = vi.fn(async () => undefined);
    const host = makeGateFormHost<{ title: string }>({
      defaultValues: { title: "hidden" },
      save,
    });
    const { latestInput, Input } = makeInputProbe({ source: "title" });
    const ui = (mode: "visible" | "hidden") => (
      <Wrapper>
        <Activity mode={mode}>
          <host.FormHost>
            <Input />
          </host.FormHost>
        </Activity>
      </Wrapper>
    );
    const view = render(ui("hidden"));
    await act(async () => {});
    // The hidden pre-render constructed controller+binding; both are inert.
    expect(host.constructedForms.size).toBeGreaterThanOrEqual(1);
    expect(host.mountEvents).toHaveLength(0);
    expect(devtools.net()).toBe(0);
    for (const form of host.constructedForms) {
      expect(liveFieldInstances(form)).toBe(0);
    }
    expect(observerCount(queryClient)).toBe(0);
    expect(setItem).not.toHaveBeenCalled();

    view.rerender(ui("visible")); // reveal -> effects mount -> attach
    await waitFor(() => expect(latestInput.current).not.toBeNull());
    const liveForm = host.latestForm.current?.form as object;
    expect(host.mountEvents).toHaveLength(1);
    expect(devtools.net()).toBe(3);
    expect(liveFieldInstances(liveForm)).toBe(1);
    expect(latestInput.current?.field.value).toBe("hidden");

    view.unmount();
    expect(devtools.net()).toBe(0);
    expect(liveFieldInstances(liveForm)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. StrictMode mount -> cleanup -> remount
// ---------------------------------------------------------------------------

describe("P5 gate: StrictMode double-mount", () => {
  it("useForm+useInput: values/meta survive the remount, onMount runs once per mount, no double side effects", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, setItem } = makeWrapper();
    const save = vi.fn(async () => undefined);
    // `title` starts as a HOLE (undefined) so the input-level default seeds;
    // a form-level `null` would win over the input default (§0b precedence).
    const host = makeGateFormHost<{ title?: string | null }>({
      defaultValues: {},
      save,
    });
    const { latestInput, Input } = makeInputProbe({
      source: "title",
      defaultValue: "seed",
    });
    // StrictMode MUST be the render root — see the makeWrapper doc block.
    const view = render(
      <StrictMode>
        <Wrapper>
          <host.FormHost>
            <Input />
          </host.FormHost>
        </Wrapper>
      </StrictMode>,
    );
    await act(async () => {});
    // StrictMode: sub -> unsub -> resub on the SAME controller. Exactly two
    // mounts, both on the one committed FormApi; the onMount validator runs
    // once per mount (probed spec under revalidateLogic); exactly one net
    // set of devtools listeners and one registered field instance survive.
    const liveForm = host.latestForm.current?.form as object;
    expect(host.mountEvents).toHaveLength(2);
    expect(new Set(host.mountEvents).size).toBe(1);
    expect(host.mountEvents[0]).toBe(liveForm);
    expect(host.onMountValidator).toHaveBeenCalledTimes(2);
    expect(devtools.net()).toBe(3);
    expect(liveFieldInstances(liveForm)).toBe(1);
    // The input default seeded exactly once, without dirtying (ground truth
    // #8: seeding uses dontUpdateMeta), and survived the remount.
    expect(latestInput.current?.field.value).toBe("seed");
    expect(latestInput.current?.fieldState.isDirty).toBe(false);
    expect(latestInput.current?.fieldState.isTouched).toBe(false);
    expect(host.latestForm.current?.isDirty).toBe(false);

    // User edits survive and mark meta exactly once.
    act(() => latestInput.current?.field.onChange("edited"));
    expect(latestInput.current?.field.value).toBe("edited");
    expect(latestInput.current?.fieldState.isDirty).toBe(true);
    expect(latestInput.current?.fieldState.isTouched).toBe(true);

    // No double side effects anywhere.
    expect(save).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();

    view.unmount();
    expect(devtools.net()).toBe(0);
    expect(liveFieldInstances(liveForm)).toBe(0);
  });

  it("useEditForm: record hydrates once without dirtying; one observer; full release on unmount", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, queryClient, getOne, setItem } = makeWrapper();
    const latest: {
      current: UseEditFormResult<(typeof rows)[number]> | null;
    } = { current: null };
    const mountEvents: object[] = [];
    function Probe() {
      latest.current = useEditForm<typeof resources, "posts">("posts", {
        id: 2,
        formOptions: {
          listeners: {
            onMount: ({ formApi }) => {
              mountEvents.push(formApi);
            },
          },
        },
      });
      return null;
    }
    // StrictMode MUST be the render root — see the makeWrapper doc block.
    const view = render(
      <StrictMode>
        <Wrapper>
          <Probe />
        </Wrapper>
      </StrictMode>,
    );
    await waitFor(() => expect(latest.current?.record).toBeDefined());
    await waitFor(() =>
      expect(latest.current?.form.state.values.title).toBe("t2"),
    );
    // Hydration must not dirty the form; the double-mount left exactly one
    // live attach (one observer, one net devtools listener set) and no
    // duplicate fetch beyond the cache's dedupe.
    expect(latest.current?.isDirty).toBe(false);
    expect(latest.current?.isTouched).toBe(false);
    expect(latest.current?.isDefaultValue).toBe(true);
    expect(observerCount(queryClient)).toBe(1);
    expect(getOne).toHaveBeenCalledTimes(1);
    expect(mountEvents).toHaveLength(2); // mount -> cleanup -> remount
    expect(new Set(mountEvents).size).toBe(1); // same FormApi both times
    expect(devtools.net()).toBe(3);

    view.unmount();
    expect(observerCount(queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
    expect(setItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Activity detach/re-attach: async-validation abort + revalidation
// ---------------------------------------------------------------------------

describe("P5 gate: Activity detach aborts in-flight async validation", () => {
  it("hide aborts the field's AbortController and discards the late result; re-attach revalidates; values survive", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, setItem } = makeWrapper();
    const save = vi.fn(async () => undefined);
    const { validator, resolvers } = makeAsyncValidator();
    const host = makeGateFormHost<{ title: string }>({
      defaultValues: { title: "v0" },
      save,
    });
    const { latestInput, Input } = makeInputProbe({
      source: "title",
      validate: validator,
    });
    const ui = (mode: "visible" | "hidden") => (
      <Wrapper>
        <host.FormHost>
          <Activity mode={mode}>
            <Input />
          </Activity>
        </host.FormHost>
      </Wrapper>
    );
    const view = render(ui("visible"));
    await act(async () => {});
    const form = host.latestForm.current?.form as object;
    expect(liveFieldInstances(form)).toBe(1);
    const fieldApi = fieldInfoMap(form).title?.instance;
    if (fieldApi == null) {
      throw new Error("gate: the mounted field instance never registered");
    }

    // Kick a submit; the async validator parks in flight.
    let firstSubmit!: Promise<void>;
    act(() => {
      firstSubmit = host.latestForm.current?.submit() as Promise<void>;
    });
    await waitFor(() => expect(validator).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(latestInput.current?.fieldState.isValidating).toBe(true),
    );
    const controllers = abortControllersOf(form, "title");
    expect(controllers.length).toBeGreaterThanOrEqual(1);
    expect(controllers.every((c) => c.signal.aborted)).toBe(false);

    // HIDE while validation is in flight: the field unmounts, every
    // in-flight AbortController fires, the validation meta clears, and no
    // debounce timers survive.
    view.rerender(ui("hidden"));
    await act(async () => {});
    expect(liveFieldInstances(form)).toBe(0);
    expect(controllers.every((c) => c.signal.aborted)).toBe(true);
    expect(abortControllersOf(form, "title")).toHaveLength(0);
    expect(pendingFieldTimers(fieldApi)).toBe(0);

    // The LATE result must be discarded — resolving with an error after the
    // abort surfaces nothing.
    await act(async () => {
      resolvers.shift()?.("late-error");
      await firstSubmit;
    });
    const fieldMeta = (
      host.latestForm.current?.form.state.fieldMeta as Record<
        string,
        { errorMap: Record<string, unknown> } | undefined
      >
    ).title;
    expect(
      Object.values(fieldMeta?.errorMap ?? {}).filter((e) => e != null),
    ).toHaveLength(0);

    // RE-ATTACH: values survive; a fresh submit revalidates and a real error
    // now lands.
    view.rerender(ui("visible"));
    await act(async () => {});
    expect(liveFieldInstances(form)).toBe(1);
    expect(latestInput.current?.field.value).toBe("v0");
    const saveCallsAfterFirst = save.mock.calls.length;

    let secondSubmit!: Promise<void>;
    act(() => {
      secondSubmit = host.latestForm.current?.submit() as Promise<void>;
    });
    await waitFor(() => expect(validator).toHaveBeenCalledTimes(2));
    await act(async () => {
      resolvers.shift()?.("async boom");
      await secondSubmit;
    });
    expect(latestInput.current?.fieldState.error).toBe("async boom");
    expect(latestInput.current?.fieldState.invalid).toBe(true);
    expect(save.mock.calls.length).toBe(saveCallsAfterFirst); // blocked

    // Post-failed-submit change revalidates (revalidateLogic) and a passing
    // run clears the error.
    act(() => latestInput.current?.field.onChange("fixed"));
    await waitFor(() => expect(validator).toHaveBeenCalledTimes(3));
    await act(async () => {
      resolvers.shift()?.(undefined);
    });
    await waitFor(() =>
      expect(latestInput.current?.fieldState.error).toBeUndefined(),
    );
    expect(latestInput.current?.field.value).toBe("fixed");

    view.unmount();
    expect(devtools.net()).toBe(0);
    expect(liveFieldInstances(form)).toBe(0);
    expect(setItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Churn — refcount drift
// ---------------------------------------------------------------------------

describe("P5 gate: churn", () => {
  it("25x Activity hide/show of form+input: counts return to baseline every cycle, values accumulate, single FormApi throughout", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, setItem } = makeWrapper();
    const save = vi.fn(async () => undefined);
    const host = makeGateFormHost<{ title: string }>({
      defaultValues: { title: "start" },
      save,
    });
    const { latestInput, Input } = makeInputProbe({ source: "title" });
    const ui = (mode: "visible" | "hidden") => (
      <Wrapper>
        <Activity mode={mode}>
          <host.FormHost>
            <Input />
          </host.FormHost>
        </Activity>
      </Wrapper>
    );
    const view = render(ui("visible"));
    await act(async () => {});
    const form = host.latestForm.current?.form as object;

    for (let cycle = 0; cycle < 25; cycle++) {
      view.rerender(ui("hidden"));
      await act(async () => {});
      expect(devtools.net(), `cycle ${cycle} hidden: devtools`).toBe(0);
      expect(liveFieldInstances(form), `cycle ${cycle} hidden: fields`).toBe(0);

      view.rerender(ui("visible"));
      await act(async () => {});
      expect(devtools.net(), `cycle ${cycle} visible: devtools`).toBe(3);
      expect(liveFieldInstances(form), `cycle ${cycle} visible: fields`).toBe(
        1,
      );
      act(() => latestInput.current?.field.onChange(`v${cycle}`));
      expect(latestInput.current?.field.value).toBe(`v${cycle}`);
    }
    // One mount per reveal + the initial one, all on the SAME FormApi.
    expect(host.mountEvents).toHaveLength(26);
    expect(new Set(host.mountEvents).size).toBe(1);
    expect(latestInput.current?.field.value).toBe("v24");
    expect(latestInput.current?.fieldState.isDirty).toBe(true);

    view.unmount();
    expect(devtools.net()).toBe(0);
    expect(liveFieldInstances(form)).toBe(0);
    expect(setItem).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("12x Activity hide/show of useEditForm: the composed observer releases and re-acquires cleanly every cycle", async () => {
    const devtools = trackDevtoolsListeners();
    const { wrapper: Wrapper, queryClient, setItem } = makeWrapper();
    const latest: {
      current: UseEditFormResult<(typeof rows)[number]> | null;
    } = { current: null };
    function Probe() {
      latest.current = useEditForm<typeof resources, "posts">("posts", {
        id: 1,
      });
      return null;
    }
    const ui = (mode: "visible" | "hidden") => (
      <Wrapper>
        <Activity mode={mode}>
          <Probe />
        </Activity>
      </Wrapper>
    );
    const view = render(ui("visible"));
    await waitFor(() => expect(latest.current?.record).toBeDefined());
    expect(observerCount(queryClient)).toBe(1);

    for (let cycle = 0; cycle < 12; cycle++) {
      view.rerender(ui("hidden"));
      await waitFor(() =>
        expect(observerCount(queryClient), `cycle ${cycle} hidden`).toBe(0),
      );
      expect(devtools.net(), `cycle ${cycle} hidden: devtools`).toBe(0);

      view.rerender(ui("visible"));
      await waitFor(() =>
        expect(observerCount(queryClient), `cycle ${cycle} visible`).toBe(1),
      );
      expect(devtools.net(), `cycle ${cycle} visible: devtools`).toBe(3);
    }
    await waitFor(() => expect(latest.current?.record).toBeDefined());
    expect(latest.current?.form.state.values.title).toBe("t1");
    expect(latest.current?.isDirty).toBe(false);

    view.unmount();
    expect(observerCount(queryClient)).toBe(0);
    expect(devtools.net()).toBe(0);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("vanilla form-controller refcount churn: 50x overlapping subscribe/unsubscribe with idempotent unsubs never drifts", () => {
    const devtools = trackDevtoolsListeners();
    let mounts = 0;
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "" },
      save: async () => undefined,
      formOptions: {
        listeners: {
          onMount: () => {
            mounts++;
          },
        },
      },
    });
    for (let i = 0; i < 50; i++) {
      const offA = controller.subscribe(noop);
      const offB = controller.subscribe(noop);
      expect(devtools.net(), `iteration ${i}: attached`).toBe(3);
      offA();
      offA(); // double-unsubscribe must not sever the sibling
      expect(devtools.net(), `iteration ${i}: after double-unsub`).toBe(3);
      offB();
      expect(devtools.net(), `iteration ${i}: detached`).toBe(0);
    }
    expect(mounts).toBe(50); // exactly one mount per 0 -> 1 transition

    // Destroy while attached releases; post-destroy subscribe is a no-op.
    const offC = controller.subscribe(noop);
    expect(devtools.net()).toBe(3);
    controller.destroy();
    expect(devtools.net()).toBe(0);
    const offD = controller.subscribe(noop);
    expect(devtools.net()).toBe(0);
    expect(mounts).toBe(51);
    offC();
    offD();
    expect(devtools.net()).toBe(0);
  });

  it("vanilla field-binding refcount churn: 50x cycles keep instance registration exact; detach clears timers", () => {
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "x" },
      save: async () => undefined,
    });
    const form = controller.form;
    const binding = createFieldBinding(
      form as CheloneFormApi<{ title: string }>,
      { source: "title" },
    );
    for (let i = 0; i < 50; i++) {
      const offA = binding.subscribe(noop);
      const offB = binding.subscribe(noop);
      expect(liveFieldInstances(form), `iteration ${i}: attached`).toBe(1);
      offA();
      offA();
      expect(
        liveFieldInstances(form),
        `iteration ${i}: after double-unsub`,
      ).toBe(1);
      offB();
      expect(liveFieldInstances(form), `iteration ${i}: detached`).toBe(0);
      expect(pendingFieldTimers(binding.field)).toBe(0);
    }
    // Values written while attached survive churn; meta flags preserved.
    const off = binding.subscribe(noop);
    binding.setValue("kept");
    off();
    expect(form.getFieldValue("title")).toBe("kept");
    expect(form.state.fieldMeta.title?.isDirty).toBe(true);
    binding.destroy();
    expect(liveFieldInstances(form)).toBe(0);
    controller.destroy();
  });
});
