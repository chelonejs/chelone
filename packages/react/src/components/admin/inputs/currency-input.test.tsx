/**
 * P7c-T4 — `<CurrencyInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`. Locale-aware money input storing either a plain number
 * (single-currency) or a composite `{ amount, currency }` (multi-currency).
 * Locale for the symbol/step derives from `displayLocale ?? useLocaleState()`.
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { CurrencyInput } from "./currency-input";

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

function makeWrapper(locale = "en") {
  const i18n = createI18n({ locale, messages });
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
    onData,
    locale,
  }: {
    defaultValues?: TFormData;
    onData?: (data: TFormData) => void;
    locale?: string;
  } = {},
) {
  const Wrapper = makeWrapper(locale);
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

afterEach(() => cleanup());

describe("<CurrencyInput>", () => {
  it("renders a number input seeded with the value and the USD symbol", () => {
    setup(<CurrencyInput source="price" currency="USD" />, {
      defaultValues: { price: 1234.5 },
    });
    const input = screen.getByLabelText("Price") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("number");
    expect(input.value).toBe("1234.5");
    expect(screen.getByText("$")).toBeTruthy();
  });

  it("writes the parsed number back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ price: number }>(
      <CurrencyInput source="price" currency="USD" />,
      { defaultValues: { price: 10 }, onData },
    );
    const input = screen.getByLabelText("Price") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "42.5" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ price: 42.5 });
  });

  it("renders a currency selector in composite mode and seeds it", () => {
    setup(<CurrencyInput source="price" currencies={["USD", "EUR"]} />, {
      defaultValues: { price: { amount: 20, currency: "EUR" } },
    });
    const select = document.querySelector(
      "select[data-currency-select]",
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe("EUR");
  });

  it("writes a composite value on amount change in composite mode", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{
      price: { amount: number; currency: string };
    }>(<CurrencyInput source="price" currencies={["USD", "EUR"]} />, {
      defaultValues: { price: { amount: 20, currency: "EUR" } },
      onData,
    });
    const input = screen.getByLabelText("Price") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "30" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({
      price: { amount: 30, currency: "EUR" },
    });
  });

  it("displays a divided major value when storeAsMinorUnits", () => {
    setup(<CurrencyInput source="price" currency="USD" storeAsMinorUnits />, {
      defaultValues: { price: 12345 },
    });
    const input = screen.getByLabelText("Price") as HTMLInputElement;
    expect(input.value).toBe("123.45");
  });

  it("stores integer minor units on write when storeAsMinorUnits", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ price: number }>(
      <CurrencyInput source="price" currency="USD" storeAsMinorUnits />,
      { defaultValues: { price: 12345 }, onData },
    );
    const input = screen.getByLabelText("Price") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "99.99" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ price: 9999 });
  });

  it("uses displayLocale to format the currency symbol", () => {
    setup(
      <CurrencyInput source="price" currency="EUR" displayLocale="de-DE" />,
      {
        defaultValues: { price: 5 },
      },
    );
    // de-DE renders the euro sign; assert the symbol span exists and is euro.
    expect(screen.getByText("€")).toBeTruthy();
  });

  it("respects the disabled prop", () => {
    setup(<CurrencyInput source="price" currency="USD" disabled />, {
      defaultValues: { price: 5 },
    });
    const input = screen.getByLabelText("Price") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ price: number | null }>(
      <CurrencyInput source="price" currency="USD" validate={required()} />,
      { defaultValues: { price: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
