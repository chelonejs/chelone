/**
 * P7b-T3 — `<NullableBooleanInput>` ported onto chelone `useInput` + `ui/select`
 * + `ui/field` + `<ValidationError>`. Verifies the tri-state select renders
 * labelled, the three options, format/parse of the null/true/false sentinel,
 * writing each of null/true/false back to the form, disabled, and error
 * surfacing.
 *
 * The `chelone.boolean.*` option keys are kept from shadmin verbatim (the port keeps
 * shadmin's translate idiom); chelone `translate` echoes a missing key, so the
 * catalog below supplies them so the option labels resolve.
 */
import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { NullableBooleanInput } from "./nullable-boolean-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.boolean.null": "",
    "chelone.boolean.true": "Yes",
    "chelone.boolean.false": "No",
  }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    save = async () => undefined,
    onData,
  }: {
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
    onData?: (data: TFormData) => void;
  } = {},
) {
  const Wrapper = makeWrapper();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data) => {
        onData?.(data);
        return save(data);
      },
    });
    submitRef.current = form.submit;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  const view = render(
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
  return { view, submitRef };
}

afterEach(() => cleanup());

/** Radix Select renders a listbox in a portal only after opening the trigger. */
function openAndSelect(optionName: RegExp) {
  fireEvent.click(screen.getByRole("combobox"));
  const listbox = screen.getByRole("listbox");
  fireEvent.click(within(listbox).getByRole("option", { name: optionName }));
}

describe("<NullableBooleanInput>", () => {
  it("renders a labelled select trigger", () => {
    setup(<NullableBooleanInput source="is_published" />, {
      defaultValues: { is_published: null },
    });
    expect(screen.getByText("Is published")).toBeTruthy();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("reflects a true default value on the trigger", () => {
    setup(<NullableBooleanInput source="is_published" />, {
      defaultValues: { is_published: true },
    });
    expect(screen.getByRole("combobox").textContent).toContain("Yes");
  });

  it("reflects a false default value on the trigger", () => {
    setup(<NullableBooleanInput source="is_published" />, {
      defaultValues: { is_published: false },
    });
    expect(screen.getByRole("combobox").textContent).toContain("No");
  });

  it("writes true to the form when the true option is chosen", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ is_published: boolean | null }>(
      <NullableBooleanInput source="is_published" />,
      { defaultValues: { is_published: null }, onData },
    );
    openAndSelect(/^Yes$/);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ is_published: true });
  });

  it("writes false to the form when the false option is chosen", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ is_published: boolean | null }>(
      <NullableBooleanInput source="is_published" />,
      { defaultValues: { is_published: null }, onData },
    );
    openAndSelect(/^No$/);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ is_published: false });
  });

  it("writes null to the form when the null option is chosen", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ is_published: boolean | null }>(
      <NullableBooleanInput source="is_published" />,
      { defaultValues: { is_published: true }, onData },
    );
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    // The null option's label is empty and is rendered first (order: null,
    // false, true). Select it to write `null` back to the form.
    const nullOption = within(listbox).getAllByRole("option")[0];
    if (!nullOption) throw new Error("expected a null option");
    fireEvent.click(nullOption);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ is_published: null });
  });

  it("renders custom true/false labels", () => {
    setup(
      <NullableBooleanInput
        source="is_published"
        trueLabel="Active"
        falseLabel="Inactive"
      />,
      { defaultValues: { is_published: true } },
    );
    expect(screen.getByRole("combobox").textContent).toContain("Active");
  });

  it("respects the disabled prop", () => {
    setup(<NullableBooleanInput source="is_published" disabled />, {
      defaultValues: { is_published: null },
    });
    expect(
      screen.getByRole("combobox").getAttribute("disabled"),
    ).not.toBeNull();
  });

  it("renders the required marker for a required validator", () => {
    setup(
      <NullableBooleanInput source="is_published" validate={required()} />,
      { defaultValues: { is_published: null } },
    );
    expect(screen.getByText("Is published").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ is_published: boolean | null }>(
      <NullableBooleanInput source="is_published" validate={required()} />,
      { defaultValues: { is_published: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
