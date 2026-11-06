/**
 * P7c-T4 — `<PhoneInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`. Stores E.164 (`+14155552671`) and renders a country
 * selector plus a national-format text input via `libphonenumber-js`.
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
import { PhoneInput } from "./phone-input";

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

afterEach(() => cleanup());

describe("<PhoneInput>", () => {
  it("renders a national-format value inferred from a stored E.164 number", () => {
    setup(<PhoneInput source="phone" />, {
      defaultValues: { phone: "+14155552671" },
    });
    const input = elementOf(screen.getByLabelText("Phone"), HTMLInputElement);
    expect(input.getAttribute("type")).toBe("tel");
    // libphonenumber formats US numbers as "(415) 555-2671".
    expect(input.value).toContain("415");
  });

  it("infers the country selector from the stored number", () => {
    setup(<PhoneInput source="phone" />, {
      defaultValues: { phone: "+14155552671" },
    });
    const select = elementOf(
      document.querySelector("select[data-country-select]"),
      HTMLSelectElement,
    );
    expect(select.value).toBe("US");
  });

  it("stores E.164 on typing a national number", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ phone: string }>(
      <PhoneInput source="phone" defaultCountry="US" />,
      { defaultValues: { phone: "" }, onData },
    );
    const input = elementOf(screen.getByLabelText("Phone"), HTMLInputElement);
    fireEvent.change(input, { target: { value: "4155552671" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ phone: "+14155552671" });
  });

  it("limits the country selector to allowedCountries", () => {
    setup(<PhoneInput source="phone" allowedCountries={["US", "GB"]} />, {
      defaultValues: { phone: "" },
    });
    const select = elementOf(
      document.querySelector("select[data-country-select]"),
      HTMLSelectElement,
    );
    expect(select.querySelectorAll("option").length).toBe(2);
  });

  it("respects the disabled prop", () => {
    setup(<PhoneInput source="phone" disabled />, {
      defaultValues: { phone: "+14155552671" },
    });
    expect(
      elementOf(screen.getByLabelText("Phone"), HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ phone: string | null }>(
      <PhoneInput source="phone" validate={required()} />,
      { defaultValues: { phone: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
