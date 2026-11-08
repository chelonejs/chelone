import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  createStore,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextInput } from "../components/admin/inputs/text-input";
import { Edit } from "../components/admin/views/edit";
import { CheloneProvider } from "../context";
import { useInput } from "../form-hooks";
import { ResourceContextProvider, ResourceRegistryProvider } from "../resource";
import { RouterAdapterProvider } from "../router/adapter";
import { reactRouterAdapter } from "../router/react-router-adapter";
import { useSaveContext } from "../save-context";
import {
  type useWizardForm,
  useWizardFormContext,
  WizardForm,
} from "./wizard-form";

interface FormValues {
  title?: string;
  body?: string;
  slug?: string;
  extra?: string;
}

/** A save that never errors and echoes the collected values back. */
function makeSave() {
  const seen: { values: FormValues | null } = { values: null };
  const save = async (values: FormValues): Promise<FieldErrors | undefined> => {
    seen.values = values;
    return undefined;
  };
  return { save, seen };
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

/** A text input that records its latest wiring for the harness to drive. */
function makeInputSlot() {
  const slot: { current: ReturnType<typeof useInput> | null } = {
    current: null,
  };
  function Input({
    source,
    validate,
  }: {
    source: string;
    validate?: ReturnType<typeof required>;
  }) {
    const input = useInput({ source, validate });
    slot.current = input;
    return null;
  }
  return { slot, Input };
}

/**
 * A three-step wizard. Step "one" has a required `title`; steps "two"/"three"
 * are free-form. Exposes the wizard controller + per-input handles + the save
 * spy so tests can drive step nav, make fields (in)valid, and submit.
 */
function makeWizard({
  onStepRender,
}: {
  onStepRender?: (step: string) => void;
} = {}) {
  const { save, seen } = makeSave();
  const titleSlot = makeInputSlot();
  const bodySlot = makeInputSlot();
  const slugSlot = makeInputSlot();
  const wizard: { current: ReturnType<typeof useWizardForm> | null } = {
    current: null,
  };

  function Capture() {
    wizard.current = useWizardFormContext();
    return null;
  }

  function StepMark({ name }: { name: string }) {
    onStepRender?.(name);
    return null;
  }

  function Host() {
    return (
      <WizardForm<FormValues> save={save}>
        <Capture />
        <WizardForm.Step name="one">
          <StepMark name="one" />
          <titleSlot.Input source="title" validate={required()} />
        </WizardForm.Step>
        <WizardForm.Step name="two">
          <StepMark name="two" />
          <bodySlot.Input source="body" />
        </WizardForm.Step>
        <WizardForm.Step name="three">
          <StepMark name="three" />
          <slugSlot.Input source="slug" />
        </WizardForm.Step>
      </WizardForm>
    );
  }

  const Wrapper = makeWrapper();
  const view = render(
    <Wrapper>
      <Host />
    </Wrapper>,
  );
  return {
    wizard,
    inputs: {
      title: titleSlot.slot,
      body: bodySlot.slot,
      slug: slugSlot.slot,
    },
    seen,
    view,
  };
}

/** Mounts `children` at `/1` under a `posts` resource, as `<Edit>` expects. */
function renderInEditRoute(
  dataProvider: ReturnType<typeof fakeDataProvider>,
  children: ReactNode,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: true,
    hasShow: false,
  });
  return render(
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages({ "chelone.action.edit": "Edit" }) },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/1"]}>
            <ResourceContextProvider value="posts">
              <Routes>
                <Route path=":id" element={children} />
              </Routes>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>,
  );
}

function SaveButton() {
  const { save } = useSaveContext();
  return (
    <button type="button" onClick={() => save?.({})}>
      Save
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useWizardForm / <WizardForm> — step navigation", () => {
  it("starts on the first step with no previous and a next available", () => {
    const { wizard } = makeWizard();
    expect(wizard.current?.currentStep).toBe(0);
    expect(wizard.current?.hasPrev).toBe(false);
    expect(wizard.current?.hasNext).toBe(true);
  });

  it("advances to the next step when the current step is valid", async () => {
    const { wizard, inputs } = makeWizard();
    // Fill the required title so step one validates.
    await act(async () => {
      inputs.title.current?.field.onChange("hello");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(1);
    expect(wizard.current?.hasPrev).toBe(true);
    expect(wizard.current?.hasNext).toBe(true);
  });

  it("prev() goes back a step and is clamped at the first step", async () => {
    const { wizard, inputs } = makeWizard();
    await act(async () => {
      inputs.title.current?.field.onChange("hello");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(1);
    await act(async () => {
      wizard.current?.prev();
    });
    expect(wizard.current?.currentStep).toBe(0);
    // Clamp: prev at the first step stays at 0.
    await act(async () => {
      wizard.current?.prev();
    });
    expect(wizard.current?.currentStep).toBe(0);
  });

  it("hasNext is false on the last step", async () => {
    const { wizard, inputs } = makeWizard();
    await act(async () => {
      inputs.title.current?.field.onChange("hello");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(2);
    expect(wizard.current?.hasNext).toBe(false);
    // next() on the last step is a no-op (does not overrun).
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(2);
  });

  it("goToStep jumps to an arbitrary index (clamped in range)", async () => {
    const { wizard } = makeWizard();
    await act(async () => {
      wizard.current?.goToStep(2);
    });
    expect(wizard.current?.currentStep).toBe(2);
    // Out-of-range indices clamp.
    await act(async () => {
      wizard.current?.goToStep(99);
    });
    expect(wizard.current?.currentStep).toBe(2);
    await act(async () => {
      wizard.current?.goToStep(-5);
    });
    expect(wizard.current?.currentStep).toBe(0);
  });
});

describe("useWizardForm — validate before advance", () => {
  it("BLOCKS next() when the current step has an invalid required field", async () => {
    const { wizard, inputs } = makeWizard();
    // title is required and empty → step one is invalid.
    await act(async () => {
      await wizard.current?.next();
    });
    // Must NOT advance.
    expect(wizard.current?.currentStep).toBe(0);
    // The required field surfaced its error (validate-before-advance ran).
    expect(inputs.title.current?.fieldState.error).toBeDefined();
  });

  it("next() returns false when blocked, true when it advances", async () => {
    const { wizard, inputs } = makeWizard();
    let blocked: boolean | undefined;
    await act(async () => {
      blocked = await wizard.current?.next();
    });
    expect(blocked).toBe(false);
    expect(wizard.current?.currentStep).toBe(0);

    await act(async () => {
      inputs.title.current?.field.onChange("hello");
    });
    let advanced: boolean | undefined;
    await act(async () => {
      advanced = await wizard.current?.next();
    });
    expect(advanced).toBe(true);
    expect(wizard.current?.currentStep).toBe(1);
  });

  it("advances once the invalid field is fixed", async () => {
    const { wizard, inputs } = makeWizard();
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(0);
    // Fix the field, then next() succeeds.
    await act(async () => {
      inputs.title.current?.field.onChange("filled");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(1);
  });

  it("only validates the CURRENT step, not later steps", async () => {
    // Step one (title required) blocks; but a later step's fields must never
    // gate the current advance. Fill title → advancing to step two must NOT be
    // blocked by step three's fields (there are none required, but the guard
    // must scope to the current step's members regardless).
    const { wizard, inputs } = makeWizard();
    await act(async () => {
      inputs.title.current?.field.onChange("ok");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(1);
    // Step two has no required fields → advancing again is free even though
    // step one's title is still the only validated-required field.
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(2);
  });
});

describe("<WizardForm> — all steps stay mounted (cross-step values survive)", () => {
  it("keeps every step's inputs mounted across navigation", async () => {
    // Every step's input registers exactly once at initial render (mounted,
    // just visually hidden) — navigating does not mount/unmount them.
    const renders: string[] = [];
    const { wizard, inputs } = makeWizard({
      onStepRender: (s) => renders.push(s),
    });
    // All three step marks rendered at mount.
    expect(new Set(renders)).toEqual(new Set(["one", "two", "three"]));
    // Every input has a live binding from the start (not just the active step).
    expect(inputs.title.current).not.toBeNull();
    expect(inputs.body.current).not.toBeNull();
    expect(inputs.slug.current).not.toBeNull();

    const rendersBeforeNav = renders.length;
    await act(async () => {
      inputs.title.current?.field.onChange("t");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    // No step re-MOUNTED on nav (would double the mark count for a step).
    expect(renders.length).toBe(rendersBeforeNav);
  });

  it("a value typed on step two survives navigating away and back", async () => {
    const { wizard, inputs } = makeWizard();
    // Advance to step two.
    await act(async () => {
      inputs.title.current?.field.onChange("t");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    expect(wizard.current?.currentStep).toBe(1);
    // Type into step two's body.
    await act(async () => {
      inputs.body.current?.field.onChange("kept");
    });
    // Go back to step one, then forward again.
    await act(async () => {
      wizard.current?.prev();
    });
    await act(async () => {
      await wizard.current?.next();
    });
    // The step-two value is still present (input was never unmounted).
    expect(inputs.body.current?.field.value).toBe("kept");
  });

  it("hides inactive steps but keeps them in the DOM", () => {
    const { view } = makeWizard();
    const steps = view.container.querySelectorAll<HTMLElement>(
      "[data-chelone-wizard-step]",
    );
    expect(steps.length).toBe(3);
    // Exactly one step is visible; the rest are hidden but present.
    const hidden = Array.from(steps).filter((el) => el.hidden);
    expect(hidden.length).toBe(2);
  });
});

describe("<WizardForm> — single submit collects all steps", () => {
  it("one submit sees values from every step", async () => {
    const { wizard, inputs, seen } = makeWizard();
    // Fill fields across all three steps, navigating validly.
    await act(async () => {
      inputs.title.current?.field.onChange("T");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    await act(async () => {
      inputs.body.current?.field.onChange("B");
    });
    await act(async () => {
      await wizard.current?.next();
    });
    await act(async () => {
      inputs.slug.current?.field.onChange("S");
    });
    // Single submit at the end.
    await act(async () => {
      await wizard.current?.submit();
    });
    expect(seen.values).toEqual({ title: "T", body: "B", slug: "S" });
  });
});

describe("useWizardFormContext / useWizardForm — errors", () => {
  it("useWizardFormContext throws outside a <WizardForm>", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Probe() {
      useWizardFormContext();
      return null;
    }
    const Wrapper = makeWrapper();
    expect(() =>
      render(
        <Wrapper>
          <Probe />
        </Wrapper>,
      ),
    ).toThrow(/WizardForm/);
    spy.mockRestore();
  });
});

describe("<WizardForm> inside <Edit>", () => {
  it("inside Edit the steps show the record and Save calls update", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Original", body: "Body" }],
    });
    const update = vi.spyOn(dataProvider, "update");
    renderInEditRoute(
      dataProvider,
      <Edit title={false}>
        <WizardForm>
          <WizardForm.Step name="one">
            <TextInput source="title" />
          </WizardForm.Step>
          <WizardForm.Step name="two">
            <TextInput source="body" />
          </WizardForm.Step>
        </WizardForm>
        <SaveButton />
      </Edit>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Original"),
    );
    expect(
      elementOf(screen.getByLabelText(/body/i), HTMLInputElement).value,
    ).toBe("Body");
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1].data).toMatchObject({
      title: "Updated",
      body: "Body",
    });
  });

  it("a WizardForm given save inside Edit builds its own form", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Original" }],
    });
    const update = vi.spyOn(dataProvider, "update");
    const ownSave = vi.fn(async (_values: unknown) => undefined);
    function SubmitOwn() {
      const { submit } = useWizardFormContext();
      return (
        <button type="button" onClick={() => submit()}>
          Submit own
        </button>
      );
    }
    renderInEditRoute(
      dataProvider,
      <Edit title={false}>
        <WizardForm save={ownSave} defaultValues={{ title: "Mine" }}>
          <WizardForm.Step name="one">
            <TextInput source="title" />
            <SubmitOwn />
          </WizardForm.Step>
        </WizardForm>
      </Edit>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Mine"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit own" }));
    await waitFor(() => expect(ownSave).toHaveBeenCalledTimes(1));
    expect(ownSave.mock.calls[0]?.[0]).toEqual({ title: "Mine" });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("<WizardForm> outside a view", () => {
  it("throws a clear error when save is missing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Wrapper = makeWrapper();
    expect(() =>
      render(
        <Wrapper>
          <WizardForm>
            <WizardForm.Step name="one">{null}</WizardForm.Step>
          </WizardForm>
        </Wrapper>,
      ),
    ).toThrow(/<WizardForm>.*save/);
  });
});
