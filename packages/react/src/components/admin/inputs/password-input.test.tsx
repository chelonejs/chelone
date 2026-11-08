/**
 * P7b-T2 — `<PasswordInput>` wraps `<TextInput>` forcing `type="password"` with
 * a visibility toggle. Verifies the masked type, the toggle flips to text, and
 * the initiallyVisible prop.
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
import { PasswordInput } from "./password-input";

const messages = {
  en: defineMessages({
    "chelone.input.password.toggle_visible": "Hide password",
    "chelone.input.password.toggle_hidden": "Show password",
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

describe("<PasswordInput>", () => {
  it("renders a masked (type=password) input by default", () => {
    setup(<PasswordInput source="password" />, { password: "secret" });
    const input = elementOf(
      screen.getByLabelText("Password"),
      HTMLInputElement,
    );
    expect(input.getAttribute("type")).toBe("password");
    expect(input.value).toBe("secret");
  });

  it("toggles the input to text when the visibility button is clicked", () => {
    setup(<PasswordInput source="password" />, { password: "secret" });
    const input = elementOf(
      screen.getByLabelText("Password"),
      HTMLInputElement,
    );
    expect(input.getAttribute("type")).toBe("password");
    const toggle = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(toggle);
    expect(input.getAttribute("type")).toBe("text");
  });

  it("puts the toggle in the input's own row, so a label never moves it off the input", () => {
    setup(<PasswordInput source="password" label="Password" />, {
      password: "secret",
    });
    const row = screen.getByLabelText("Password").parentElement;
    expect(row?.querySelector("button")).not.toBeNull();
    expect(row?.querySelector("label")).toBeNull();
  });

  it("renders visible text first when initiallyVisible is set", () => {
    setup(<PasswordInput source="password" initiallyVisible />, {
      password: "secret",
    });
    const input = elementOf(
      screen.getByLabelText("Password"),
      HTMLInputElement,
    );
    expect(input.getAttribute("type")).toBe("text");
  });

  it("respects the disabled prop", () => {
    setup(<PasswordInput source="password" disabled />, { password: "x" });
    expect(
      elementOf(screen.getByLabelText("Password"), HTMLInputElement).disabled,
    ).toBe(true);
  });
});
