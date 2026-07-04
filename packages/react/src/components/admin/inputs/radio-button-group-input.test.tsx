/**
 * P7c-T1 — `<RadioButtonGroupInput>` ported onto chelone `useChoicesContext` +
 * `useChoices` + `useInput` + `ui/radio-group` + `ui/field` +
 * `<ValidationError>`. Verifies radios render, selecting writes the
 * original-typed value, the required marker, and error surfacing.
 */
import {
  createI18n,
  createResourceRegistry,
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { RadioButtonGroupInput } from "./radio-button-group-input";

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  const registry = createResourceRegistry();
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        {children}
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    onData,
  }: {
    defaultValues?: TFormData;
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
      save: async (data): Promise<FieldErrors | undefined> => {
        onData?.(data);
        return undefined;
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

const choices = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];

afterEach(() => cleanup());

describe("<RadioButtonGroupInput>", () => {
  it("renders a radio per choice", () => {
    setup(
      <RadioButtonGroupInput
        source="category"
        choices={choices}
        label="Category"
      />,
      { defaultValues: { category: "" } },
    );
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByLabelText("Tech")).toBeTruthy();
    expect(screen.getByLabelText("Lifestyle")).toBeTruthy();
    expect(screen.getByLabelText("People")).toBeTruthy();
  });

  it("checks the radio matching the default value", () => {
    setup(<RadioButtonGroupInput source="category" choices={choices} />, {
      defaultValues: { category: "lifestyle" },
    });
    expect(
      (screen.getByLabelText("Lifestyle") as HTMLButtonElement).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("writes the selected value back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ category: string }>(
      <RadioButtonGroupInput source="category" choices={choices} />,
      { defaultValues: { category: "" }, onData },
    );
    fireEvent.click(screen.getByLabelText("People"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ category: "people" });
  });

  it("preserves a numeric choice id on selection", async () => {
    const numericChoices = [
      { id: 1, name: "One" },
      { id: 2, name: "Two" },
    ];
    const onData = vi.fn();
    const { submitRef } = setup<{ rating: number | string }>(
      <RadioButtonGroupInput source="rating" choices={numericChoices} />,
      { defaultValues: { rating: "" }, onData },
    );
    fireEvent.click(screen.getByLabelText("Two"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ rating: 2 });
  });

  it("renders the required marker for a required validator", () => {
    setup(
      <RadioButtonGroupInput
        source="category"
        choices={choices}
        validate={required()}
        label="Category"
      />,
      { defaultValues: { category: "" } },
    );
    expect(screen.getByText("Category").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ category: string }>(
      <RadioButtonGroupInput
        source="category"
        choices={choices}
        validate={required()}
        label="Category"
      />,
      { defaultValues: { category: "" } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
