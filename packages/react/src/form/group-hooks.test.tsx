import {
  createNotificationStore,
  createStore,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, render, renderHook } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../context";
import { CheloneFormProvider } from "../form-context";
import { useForm, useInput } from "../form-hooks";
import {
  FormGroupProvider,
  FormGroupsProvider,
  useFormGroup,
  useFormGroups,
} from "./group-hooks";

interface FormValues {
  title?: string;
  body?: string;
  slug?: string;
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

/** A save that never errors. */
const okSave = async (): Promise<FieldErrors | undefined> => undefined;

/**
 * Mounts a form with two named groups. Inputs in group "general" and group
 * "meta"; each input auto-registers into the ambient group via
 * `<FormGroupProvider>`. Exposes render-count spies for the badges.
 */
function makeGroupedForm({
  strict = false,
  onGeneralRender,
  onMetaRender,
}: {
  strict?: boolean;
  onGeneralRender?: () => void;
  onMetaRender?: () => void;
} = {}) {
  const inputs: Record<string, ReturnType<typeof useInput> | null> = {
    title: null,
    body: null,
    slug: null,
  };
  const badges: {
    general: ReturnType<typeof useFormGroup> | null;
    meta: ReturnType<typeof useFormGroup> | null;
  } = { general: null, meta: null };
  const latestForm: {
    current: ReturnType<typeof useForm<FormValues>> | null;
  } = { current: null };

  function Input({ source }: { source: string }) {
    const input = useInput({
      source,
      validate: source === "title" ? required() : undefined,
    });
    inputs[source] = input;
    return null;
  }

  function GeneralBadge() {
    onGeneralRender?.();
    badges.general = useFormGroup("general");
    return null;
  }
  function MetaBadge() {
    onMetaRender?.();
    badges.meta = useFormGroup("meta");
    return null;
  }

  function FormHost() {
    const form = useForm<FormValues>({ save: okSave });
    latestForm.current = form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        <FormGroupsProvider>
          <FormGroupProvider name="general">
            <Input source="title" />
            <Input source="body" />
            <GeneralBadge />
          </FormGroupProvider>
          <FormGroupProvider name="meta">
            <Input source="slug" />
            <MetaBadge />
          </FormGroupProvider>
        </FormGroupsProvider>
      </CheloneFormProvider>
    );
  }

  const Wrapper = makeWrapper();
  const tree = strict ? (
    <StrictMode>
      <Wrapper>
        <FormHost />
      </Wrapper>
    </StrictMode>
  ) : (
    <Wrapper>
      <FormHost />
    </Wrapper>
  );
  return { inputs, badges, latestForm, view: render(tree) };
}

describe("FormGroupsProvider + useFormGroup", () => {
  it("useFormGroup throws without a FormGroupsProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderHook(() => useFormGroups(), { wrapper: makeWrapper() }),
    ).toThrow(/FormGroupsProvider/);
    spy.mockRestore();
  });

  it("aggregates member validity: an invalid required field flips the group invalid", async () => {
    const { inputs, badges, latestForm } = makeGroupedForm();
    // form-core revalidateLogic: field validators fire on SUBMIT (then
    // re-validate on change). title is required + empty → a submit attempt
    // surfaces its error and flips the "general" group invalid.
    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(badges.general?.isValid).toBe(false);
    expect(badges.general?.errors.title).toBeDefined();
    // The "meta" group (only slug, no validators) stays valid.
    expect(badges.meta?.isValid).toBe(true);

    // Fixing the required field clears the group (revalidate-on-change latched).
    await act(async () => {
      inputs.title?.field.onChange("filled");
    });
    expect(badges.general?.isValid).toBe(true);
    expect(badges.general?.errors.title).toBeUndefined();
  });

  it("isDirty aggregates OR across group members", async () => {
    const { inputs, badges } = makeGroupedForm();
    expect(badges.general?.isDirty).toBe(false);
    await act(async () => {
      inputs.body?.field.onChange("edited");
    });
    expect(badges.general?.isDirty).toBe(true);
    // The other group is untouched.
    expect(badges.meta?.isDirty).toBe(false);
  });

  it("does not re-render a group badge when an unrelated group's field keeps changing", async () => {
    const onMetaRender = vi.fn();
    const { inputs } = makeGroupedForm({ onMetaRender });
    // Warm-up: the first cross-group write settles both groups' fieldMeta once
    // (form-core materializes derived meta on the first mutation). We measure
    // isolation on STEADY-STATE keystrokes after that settle.
    await act(async () => {
      inputs.body?.field.onChange("a");
    });
    const settled = onMetaRender.mock.calls.length;
    // Further typing into the "general" group must NOT re-render the "meta" badge.
    await act(async () => {
      inputs.body?.field.onChange("ab");
    });
    await act(async () => {
      inputs.body?.field.onChange("abc");
    });
    expect(onMetaRender.mock.calls.length).toBe(settled);
  });

  it("unmounting an input unregisters it from the group", async () => {
    const groupState: { current: ReturnType<typeof useFormGroup> | null } = {
      current: null,
    };
    function Badge() {
      groupState.current = useFormGroup("g");
      return null;
    }
    function Host({ showSecond }: { showSecond: boolean }) {
      const form = useForm<FormValues>({ save: okSave });
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <FormGroupsProvider>
            <FormGroupProvider name="g">
              <InputProbe source="title" />
              {showSecond ? <InputProbe source="body" /> : null}
              <Badge />
            </FormGroupProvider>
          </FormGroupsProvider>
        </CheloneFormProvider>
      );
    }
    function InputProbe({ source }: { source: string }) {
      useInput({ source });
      return null;
    }
    const Wrapper = makeWrapper();
    const { rerender } = render(
      <Wrapper>
        <Host showSecond={true} />
      </Wrapper>,
    );
    // Remove the "body" input.
    await act(async () => {
      rerender(
        <Wrapper>
          <Host showSecond={false} />
        </Wrapper>,
      );
    });
    // body no longer a member — its meta must not be aggregated.
    expect(groupState.current?.errors.body).toBeUndefined();
  });

  it("survives StrictMode double-invoke without duplicate registration", async () => {
    const { badges, latestForm } = makeGroupedForm({ strict: true });
    await act(async () => {
      await latestForm.current?.submit();
    });
    // Even with StrictMode double effects, membership is deduped → aggregation
    // is correct (the required title flips the group invalid exactly once).
    expect(badges.general?.isValid).toBe(false);
    expect(Object.keys(badges.general?.errors ?? {})).toEqual(["title"]);
  });
});
