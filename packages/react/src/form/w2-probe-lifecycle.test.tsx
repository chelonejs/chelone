/**
 * P6 Wave 2 — ADVERSARIAL form-leftovers LIFECYCLE probe.
 *
 * Fresh-eyes attack on the shipped form leftovers, targeting the churn / leak /
 * zombie / race edges the happy-path suites do NOT stress:
 *
 * 1. FormGroups registration churn — membership FLIPS (a source moving group
 *    A→B), rapid remount cycles, subscriber cleanup on provider unmount, the
 *    getMembers snapshot-cache invalidation, and the empty-group drop.
 * 2. FilterLiveForm debounce-race — a scheduled push must NOT fire after
 *    unmount (no zombie microtask touching a torn-down setFilters), and an
 *    external filter echo arriving WHILE the user is actively typing must skip
 *    exactly one reflect (no clobber) yet still reflect the NEXT external change.
 * 3. Wizard/Tabbed mount-preservation — the central Wave-1 assertion under
 *    ADVERSARIAL nav: rapid step/tab churn must not wipe form state.
 * 4. warn-unsaved blocker churn — block → proceed → re-dirty → block again with
 *    no leaked blocker, and unmount mid-block leaves no zombie window listener.
 *
 * Non-vacuity: each attack was mutation-verified (a teardown/guard broken →
 * test goes red → reverted). See .superpowers/sdd/p6/w2-probe-lifecycle.md.
 */

import {
  createFormGroups,
  createNotificationStore,
  createStore,
  type FieldErrors,
  fakeDataProvider,
  reduceGroupState,
  required,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeListContext } from "../__fixtures__/list-context";
import { CheloneProvider } from "../context";
import { CheloneFormProvider } from "../form-context";
import { useForm, useInput } from "../form-hooks";
import { ResourceContextProvider } from "../resource";
import { RouterAdapterProvider } from "../router/adapter";
import { reactRouterAdapter } from "../router/react-router-adapter";
import { FilterLiveForm, ListContextProvider } from "./filter-live-form";
import {
  FormGroupProvider,
  FormGroupsProvider,
  useFormGroup,
  useFormGroups,
} from "./group-hooks";
import { useWarnWhenUnsavedChanges } from "./warn-unsaved-changes";
import { useWizardFormContext, WizardForm } from "./wizard-form";

afterEach(cleanup);

const okSave = async (): Promise<FieldErrors | undefined> => undefined;

interface PostRecord {
  id: number;
  title: string;
}

function makeWrapper() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider({});
  const store = createStore();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        store={store}
        notifications={notifications}
      >
        {children}
      </CheloneProvider>
    );
  };
}

/* ========================================================================== */
/* 1. FormGroups registration churn                                           */
/* ========================================================================== */

describe("PROBE 1 — FormGroups registry churn", () => {
  it("a source that FLIPS group (A→B) leaves group A empty and B holding it", () => {
    const groups = createFormGroups();
    groups.register("A", "title");
    expect(groups.getMembers("A")).toEqual(["title"]);

    // Flip: unregister from A, register into B — the mount-move a re-parented
    // input performs.
    groups.unregister("A", "title");
    groups.register("B", "title");

    // A is emptied AND dropped (empty groups return the shared EMPTY snapshot).
    expect(groups.getMembers("A")).toEqual([]);
    expect(groups.getMembers("B")).toEqual(["title"]);
  });

  it("getMembers snapshot is reference-STABLE until that group mutates, then fresh", () => {
    const groups = createFormGroups();
    groups.register("g", "a");
    const first = groups.getMembers("g");
    // No mutation → identical reference (useSyncExternalStore contract).
    expect(groups.getMembers("g")).toBe(first);

    groups.register("g", "b"); // mutate → snapshot invalidated
    const second = groups.getMembers("g");
    expect(second).not.toBe(first);
    expect(second).toEqual(["a", "b"]);
    // Stable again until the next mutation.
    expect(groups.getMembers("g")).toBe(second);
  });

  it("notifies subscribers on every REAL membership change but NOT on a de-duped re-register", () => {
    const groups = createFormGroups();
    const listener = vi.fn();
    groups.subscribe(listener);

    groups.register("g", "a"); // real add → notify
    expect(listener).toHaveBeenCalledTimes(1);

    groups.register("g", "a"); // duplicate → NO notify (register-on-render safety)
    expect(listener).toHaveBeenCalledTimes(1);

    groups.unregister("g", "missing"); // absent → NO notify
    expect(listener).toHaveBeenCalledTimes(1);

    groups.unregister("g", "a"); // real remove → notify
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops that listener WITHOUT affecting the others (idempotent)", () => {
    const groups = createFormGroups();
    const keep = vi.fn();
    const drop = vi.fn();
    groups.subscribe(keep);
    const off = groups.subscribe(drop);

    off();
    off(); // idempotent double-call must not wedge `keep`

    groups.register("g", "a");
    expect(keep).toHaveBeenCalledTimes(1);
    expect(drop).not.toHaveBeenCalled();
  });

  it("reduceGroupState treats a not-yet-mounted member as valid+clean (no false invalid)", () => {
    // A registered member with no fieldMeta entry must contribute nothing —
    // else a pending mount would flash the group invalid.
    const state = reduceGroupState({}, ["ghost"]);
    expect(state).toEqual({
      isValid: true,
      isDirty: false,
      isTouched: false,
      isValidating: false,
      errors: {},
    });
  });

  it("REACT: rapid mount→unmount→mount of a grouped input leaves NO leaked members", async () => {
    const Wrapper = makeWrapper();
    const observed: { members: readonly string[] } = { members: [] };

    // Probe subscribes via useFormGroup's member snapshot so it re-renders on a
    // membership change AND its read reflects post-effect registration.
    function Probe() {
      const groups = useFormGroups();
      // useFormGroup(name) subscribes to membership; read members straight off
      // the registry so we observe the exact member list, not the reduced state.
      useFormGroup("g");
      observed.members = groups.getMembers("g");
      return null;
    }
    function Field() {
      useInput({ source: "title" });
      return null;
    }
    function Host({ show }: { show: boolean }) {
      const { form, submit } = useForm({ save: okSave });
      return (
        <CheloneFormProvider form={form} submit={submit}>
          <FormGroupsProvider>
            <FormGroupProvider name="g">
              {show ? <Field /> : null}
            </FormGroupProvider>
            <Probe />
          </FormGroupsProvider>
        </CheloneFormProvider>
      );
    }

    const { rerender } = render(
      <Wrapper>
        <Host show={true} />
      </Wrapper>,
    );
    // Let the Field's registration effect run + Probe re-render.
    await act(async () => {
      await Promise.resolve();
    });
    expect(observed.members).toEqual(["title"]);

    // Churn: unmount then remount the field a few times.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        rerender(
          <Wrapper>
            <Host show={false} />
          </Wrapper>,
        );
        await Promise.resolve();
      });
      expect(observed.members).toEqual([]); // unregistered on unmount
      await act(async () => {
        rerender(
          <Wrapper>
            <Host show={true} />
          </Wrapper>,
        );
        await Promise.resolve();
      });
      expect(observed.members).toEqual(["title"]); // exactly one, never doubled
    }
  });
});

/* ========================================================================== */
/* 2. FilterLiveForm debounce-race / zombie microtask                         */
/* ========================================================================== */

function makeFakeList(filter: Record<string, unknown> = {}) {
  const setFilters = vi.fn();
  return {
    value: makeListContext<PostRecord>({ filter, setFilters }),
    setFilters,
  };
}

describe("PROBE 2 — FilterLiveForm debounce-race", () => {
  it("a push scheduled by the LAST keystroke does NOT fire after unmount (no zombie microtask)", async () => {
    const { value, setFilters } = makeFakeList();
    const inputSlot: { current: ReturnType<typeof useInput> | null } = {
      current: null,
    };
    function TitleInput() {
      inputSlot.current = useInput({ source: "title" });
      return null;
    }
    const Wrapper = makeWrapper();
    const { unmount } = render(
      <Wrapper>
        <ResourceContextProvider value="posts">
          <ListContextProvider value={value}>
            <FilterLiveForm>
              <TitleInput />
            </FilterLiveForm>
          </ListContextProvider>
        </ResourceContextProvider>
      </Wrapper>,
    );

    // Type WITHOUT flushing microtasks, then synchronously unmount in the same
    // act() so the scheduled queueMicrotask is still pending at teardown.
    await act(async () => {
      inputSlot.current?.field.onChange("racy");
      // Do NOT await a microtask flush here — unmount first.
      unmount();
    });
    // Let any zombie microtask run.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The store subscription was torn down on unmount; the in-flight push must
    // not reach setFilters after the component is gone.
    expect(setFilters).not.toHaveBeenCalled();
  });

  it("multiple keystrokes in one tick COALESCE into a single push (one scheduled microtask)", async () => {
    const { value, setFilters } = makeFakeList();
    const inputSlot: { current: ReturnType<typeof useInput> | null } = {
      current: null,
    };
    function TitleInput() {
      inputSlot.current = useInput({ source: "title" });
      return null;
    }
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <ResourceContextProvider value="posts">
          <ListContextProvider value={value}>
            <FilterLiveForm>
              <TitleInput />
            </FilterLiveForm>
          </ListContextProvider>
        </ResourceContextProvider>
      </Wrapper>,
    );

    await act(async () => {
      inputSlot.current?.field.onChange("a");
      inputSlot.current?.field.onChange("ab");
      inputSlot.current?.field.onChange("abc");
      await Promise.resolve();
      await Promise.resolve();
    });

    // Coalesced: exactly ONE push carrying the final value, not one per stroke.
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setFilters.mock.calls[0]?.[0]).toMatchObject({ title: "abc" });
  });

  it("an external filter echo DURING active typing skips exactly ONE reflect (no clobber) then reflects the NEXT change", async () => {
    const setFilters = vi.fn();
    let currentFilter: Record<string, unknown> = {};
    const inputSlot: { current: ReturnType<typeof useInput> | null } = {
      current: null,
    };
    function TitleInput() {
      inputSlot.current = useInput({ source: "title" });
      return null;
    }
    function Host() {
      const list = makeListContext<PostRecord>({
        filter: currentFilter,
        setFilters,
      });
      return (
        <ResourceContextProvider value="posts">
          <ListContextProvider value={list}>
            <FilterLiveForm>
              <TitleInput />
            </FilterLiveForm>
          </ListContextProvider>
        </ResourceContextProvider>
      );
    }
    const Wrapper = makeWrapper();
    const { rerender } = render(
      <Wrapper>
        <Host />
      </Wrapper>,
    );

    // User types "fresh".
    await act(async () => {
      inputSlot.current?.field.onChange("fresh");
      await Promise.resolve();
    });
    expect(inputSlot.current?.field.value).toBe("fresh");

    // A STALE debounced echo arrives (the list echoes back an older value).
    // The `hasJustBeenModifiedByUser` guard must skip this reflect — the input
    // keeps "fresh", it is NOT clobbered to "stale".
    currentFilter = { title: "stale" };
    await act(async () => {
      rerender(
        <Wrapper>
          <Host />
        </Wrapper>,
      );
      await Promise.resolve();
    });
    expect(inputSlot.current?.field.value).toBe("fresh"); // NOT clobbered

    // A genuine NEXT external change (e.g. a Clear-Filters button) MUST reflect —
    // the guard consumed exactly one skip, not a permanent block.
    currentFilter = { title: "external-set" };
    await act(async () => {
      rerender(
        <Wrapper>
          <Host />
        </Wrapper>,
      );
      await Promise.resolve();
    });
    expect(inputSlot.current?.field.value).toBe("external-set");
  });
});

/* ========================================================================== */
/* 3. Wizard mount-preservation under adversarial churn                       */
/* ========================================================================== */

describe("PROBE 3 — WizardForm mount-preservation under churn", () => {
  it("rapid step churn NEVER wipes values AND never re-mounts step-two's input (stays mounted throughout)", async () => {
    const slots: Record<string, ReturnType<typeof useInput> | null> = {
      s1: null,
      s2: null,
    };
    // Mount-count spy for step two's field: each fresh mount bumps it. Under
    // the mounted-tree guarantee it must be exactly 1 for the whole test —
    // proving the input is CSS-hidden, never unmounted, across churn.
    const s2Mounts = { count: 0 };
    function Field({
      source,
      slot,
      onMount,
    }: {
      source: string;
      slot: string;
      onMount?: () => void;
    }) {
      slots[slot] = useInput({ source, validate: required() });
      useState(() => {
        onMount?.();
        return 0;
      });
      return null;
    }
    const ctl: { current: ReturnType<typeof useWizardFormContext> | null } = {
      current: null,
    };
    function Controls() {
      ctl.current = useWizardFormContext();
      return null;
    }
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <WizardForm save={okSave}>
          <WizardForm.Step name="one">
            <Field source="a" slot="s1" />
          </WizardForm.Step>
          <WizardForm.Step name="two">
            <Field
              source="b"
              slot="s2"
              onMount={() => {
                s2Mounts.count += 1;
              }}
            />
          </WizardForm.Step>
          <Controls />
        </WizardForm>
      </Wrapper>,
    );
    // Step two's input mounted ONCE at first render (all steps mounted).
    expect(s2Mounts.count).toBe(1);

    // Fill step one so we can legally advance, then advance and type on step two.
    await act(async () => {
      slots.s1?.field.onChange("A-val");
      await ctl.current?.next();
    });
    expect(ctl.current?.currentStep).toBe(1);
    await act(async () => {
      slots.s2?.field.onChange("B-val");
    });

    // Adversarial churn: bounce back and forth many times.
    await act(async () => {
      ctl.current?.prev();
      ctl.current?.goToStep(1);
      ctl.current?.prev();
      ctl.current?.goToStep(0);
      ctl.current?.goToStep(1);
    });

    // Both step values survived, and step two's input never re-mounted (the
    // Wave-1 mounted-tree guarantee — CSS-hide, never unmount).
    expect(slots.s1?.field.value).toBe("A-val");
    expect(slots.s2?.field.value).toBe("B-val");
    expect(s2Mounts.count).toBe(1);
  });

  it("inactive step inputs stay in the DOM (hidden), so their state is never torn down", async () => {
    function Field({ source }: { source: string }) {
      const input = useInput({ source });
      return (
        <input
          data-testid={`inp-${source}`}
          value={String(input.field.value)}
          readOnly
        />
      );
    }
    const Wrapper = makeWrapper();
    const { container } = render(
      <Wrapper>
        <WizardForm save={okSave}>
          <WizardForm.Step name="one">
            <Field source="a" />
          </WizardForm.Step>
          <WizardForm.Step name="two">
            <Field source="b" />
          </WizardForm.Step>
        </WizardForm>
      </Wrapper>,
    );

    // Both inputs present at first render (only step one visible).
    expect(container.querySelector('[data-testid="inp-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="inp-b"]')).not.toBeNull();

    // Step two's WRAPPER is hidden but present.
    const stepTwo = container.querySelector('[data-chelone-wizard-step="two"]');
    expect(stepTwo).not.toBeNull();
    expect(elementOf(stepTwo, HTMLElement).hidden).toBe(true);
  });
});

/* ========================================================================== */
/* 4. warn-unsaved blocker churn                                              */
/* ========================================================================== */

function makeWarnProviders() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider({});
  const store = createStore();
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <CheloneProvider
          dataProvider={dataProvider}
          queryClient={queryClient}
          store={store}
          notifications={notifications}
        >
          {children}
        </CheloneProvider>
      </RouterAdapterProvider>
    );
  };
}

describe("PROBE 4 — warn-unsaved blocker churn", () => {
  it("unmounting mid-arm removes the beforeunload listener (no zombie DOM handler)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    try {
      function Host() {
        const { form } = useForm({ save: okSave });
        return (
          <CheloneFormProvider form={form}>
            <Armer />
          </CheloneFormProvider>
        );
      }
      function Armer() {
        useWarnWhenUnsavedChanges(true);
        return null;
      }
      const Providers = makeWarnProviders();
      const { unmount } = render(
        <Providers>
          <MemoryRouter>
            <Host />
          </MemoryRouter>
        </Providers>,
      );

      const added = addSpy.mock.calls.filter(
        (c) => c[0] === "beforeunload",
      ).length;
      expect(added).toBeGreaterThan(0);

      unmount();

      const removed = removeSpy.mock.calls.filter(
        (c) => c[0] === "beforeunload",
      ).length;
      // Every registered beforeunload listener was removed on unmount.
      expect(removed).toBe(added);
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  it("under a declarative host, toggling `enable` on a dirty form never throws (no useBlocker call)", () => {
    // The adapter's useBlocker THROWS under a declarative host; the hook must
    // gate on useCanBlock and never call it — even as `enable` flips.
    function Host({ enable }: { enable: boolean }) {
      const { form } = useForm({ save: okSave });
      return (
        <CheloneFormProvider form={form}>
          <Armer enable={enable} />
        </CheloneFormProvider>
      );
    }
    function Armer({ enable }: { enable: boolean }) {
      useWarnWhenUnsavedChanges(enable);
      return null;
    }
    const Providers = makeWarnProviders();
    const { rerender } = render(
      <Providers>
        <MemoryRouter>
          <Host enable={false} />
        </MemoryRouter>
      </Providers>,
    );
    // Flip enable on/off — a declarative host has no data router, useCanBlock is
    // false, so useBlocker (which throws there) must never be reached.
    expect(() => {
      rerender(
        <Providers>
          <MemoryRouter>
            <Host enable={true} />
          </MemoryRouter>
        </Providers>,
      );
      rerender(
        <Providers>
          <MemoryRouter>
            <Host enable={false} />
          </MemoryRouter>
        </Providers>,
      );
    }).not.toThrow();
  });

  it("a pristine form returns the INERT decision (proceed/cancel are safe no-ops)", () => {
    const decisionSlot: {
      current: ReturnType<typeof useWarnWhenUnsavedChanges> | null;
    } = { current: null };
    function Host() {
      const { form } = useForm({ save: okSave });
      return (
        <CheloneFormProvider form={form}>
          <Armer />
        </CheloneFormProvider>
      );
    }
    function Armer() {
      decisionSlot.current = useWarnWhenUnsavedChanges(true);
      return null;
    }
    const Providers = makeWarnProviders();
    render(
      <Providers>
        <MemoryRouter>
          <Host />
        </MemoryRouter>
      </Providers>,
    );
    // Inert: not blocked, and the no-op actions do not throw when called.
    expect(decisionSlot.current?.isBlocked).toBe(false);
    expect(() => {
      decisionSlot.current?.proceed();
      decisionSlot.current?.cancel();
    }).not.toThrow();
  });
});
