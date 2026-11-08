/**
 * P7b-T2 — `<ResettableTextInput>` wraps `<TextInput>` and adds a clear (×)
 * button. Rebridged off RHF (`useFormContext().setValue` + `useWatch`) onto
 * chelone's `useCheloneFormContext().form.setFieldValue` + the `useWatch` shim.
 * Verifies the clear button visibility, that clicking clears the value, and
 * `clearAlwaysVisible`.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResettableTextInput } from "./resettable-text-input";

const messages = {
  en: defineMessages({ "chelone.action.clear_input_value": "Clear value" }),
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

function setup(ui: ReactNode, defaultValues?: Record<string, unknown>) {
  const Wrapper = makeWrapper();
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm({ defaultValues, save: async () => undefined });
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  return render(
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
}

afterEach(() => cleanup());

describe("<ResettableTextInput>", () => {
  it("shows a clear button when the field has a value", () => {
    setup(<ResettableTextInput source="title" />, {
      title: "War and Peace",
    });
    expect(screen.getByRole("button", { name: /clear value/i })).toBeTruthy();
  });

  it("hides the clear button when the field is empty", () => {
    setup(<ResettableTextInput source="title" />, { title: "" });
    expect(screen.queryByRole("button", { name: /clear value/i })).toBeNull();
  });

  it("clears the input value when the clear button is clicked", () => {
    setup(<ResettableTextInput source="title" />, {
      title: "War and Peace",
    });
    const input = elementOf(screen.getByLabelText("Title"), HTMLInputElement);
    expect(input.value).toBe("War and Peace");
    fireEvent.click(screen.getByRole("button", { name: /clear value/i }));
    expect(input.value).toBe("");
  });

  it("keeps the clear button visible when clearAlwaysVisible is set", () => {
    setup(<ResettableTextInput source="title" clearAlwaysVisible />, {
      title: "",
    });
    expect(screen.getByRole("button", { name: /clear value/i })).toBeTruthy();
  });

  it("hides the clear button entirely when resettable is false", () => {
    setup(<ResettableTextInput source="title" resettable={false} />, {
      title: "War and Peace",
    });
    expect(screen.queryByRole("button", { name: /clear value/i })).toBeNull();
  });

  it("puts the clear button in the input's own row, beside the input and nothing else", () => {
    setup(<ResettableTextInput source="title" />, {
      title: "War and Peace",
    });
    const input = elementOf(screen.getByLabelText("Title"), HTMLInputElement);
    const clear = screen.getByRole("button", { name: /clear value/i });
    // The row is what the button's `absolute` position resolves against, so it
    // must hold the input and the button alone: a label, helper text or error
    // above or below would shift the button off the input's centre.
    expect(clear.parentElement).toBe(input.parentElement);
    expect(input.parentElement?.querySelector("label")).toBeNull();
  });

  it("puts the clear button in the input's own row when the field has no label", () => {
    setup(<ResettableTextInput source="title" label={false} />, {
      title: "War and Peace",
    });
    const input = elementOf(screen.getByRole("textbox"), HTMLInputElement);
    const clear = screen.getByRole("button", { name: /clear value/i });
    expect(clear.parentElement).toBe(input.parentElement);
  });

  it("keeps the clear button for a multiline field, in the textarea's own row", () => {
    setup(<ResettableTextInput source="body" multiline />, {
      body: "A long description",
    });
    const textarea = elementOf(
      screen.getByLabelText("Body"),
      HTMLTextAreaElement,
    );
    const clear = screen.getByRole("button", { name: /clear value/i });
    expect(clear.parentElement).toBe(textarea.parentElement);
    fireEvent.click(clear);
    expect(textarea.value).toBe("");
  });

  it("respects the disabled prop", () => {
    setup(<ResettableTextInput source="title" disabled />, {
      title: "x",
    });
    expect(
      elementOf(screen.getByLabelText("Title"), HTMLInputElement).disabled,
    ).toBe(true);
  });
});
