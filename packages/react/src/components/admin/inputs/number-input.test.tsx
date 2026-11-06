/**
 * P7b-T2 — `<NumberInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`. Verifies the number type, parse-empty→null, the local
 * string-state typing buffer, required marker, and error surfacing.
 */
import {
  createI18n,
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { NumberInput } from "./number-input";

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
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
  const formRef: { current: unknown } = { current: null };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data) => {
        onData?.(data);
        return save(data);
      },
    });
    submitRef.current = form.submit;
    formRef.current = form.form;
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
  return { view, submitRef, formRef };
}

afterEach(() => cleanup());

describe("<NumberInput>", () => {
  it("renders a labelled input of type number", () => {
    setup(<NumberInput source="price" />, { defaultValues: { price: 12 } });
    const input = elementOf(screen.getByLabelText("Price"), HTMLInputElement);
    expect(input.getAttribute("type")).toBe("number");
    expect(input.value).toBe("12");
  });

  it("writes a parsed number back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ price: number | null }>(
      <NumberInput source="price" />,
      { defaultValues: { price: null }, onData },
    );
    const input = elementOf(screen.getByLabelText("Price"), HTMLInputElement);
    fireEvent.change(input, { target: { value: "42" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ price: 42 });
  });

  it("parses an empty input to null (not zero)", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ price: number | null }>(
      <NumberInput source="price" />,
      { defaultValues: { price: 7 }, onData },
    );
    const input = elementOf(screen.getByLabelText("Price"), HTMLInputElement);
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ price: null });
  });

  it("forwards the step and min attributes", () => {
    setup(<NumberInput source="price" step={0.01} min={0} />, {
      defaultValues: { price: 1 },
    });
    const input = elementOf(screen.getByLabelText("Price"), HTMLInputElement);
    expect(input.getAttribute("step")).toBe("0.01");
    expect(input.getAttribute("min")).toBe("0");
  });

  it("renders the required marker for a required validator", () => {
    setup(<NumberInput source="price" validate={required()} />, {
      defaultValues: { price: null },
    });
    expect(screen.getByText("Price").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ price: number | null }>(
      <NumberInput source="price" validate={required()} />,
      { defaultValues: { price: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });

  it("respects the disabled prop", () => {
    setup(<NumberInput source="price" disabled />, {
      defaultValues: { price: 1 },
    });
    expect(
      elementOf(screen.getByLabelText("Price"), HTMLInputElement).disabled,
    ).toBe(true);
  });
});
