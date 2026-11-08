/**
 * P7c-T4 — `<SearchInput>` ported onto @chelone/react. A filter-form live
 * text input with a search icon and a clear button. Composes the ported
 * `<TextInput>`; reads the live value via the P7a `useWatch` shim and clears
 * via `form.setFieldValue`.
 */
import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
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
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { SearchInput } from "./search-input";

const messages = {
  en: defineMessages({
    "chelone.action.search": "Search",
    "chelone.action.clear_search": "Clear search",
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
  { defaultValues }: { defaultValues?: TFormData } = {},
) {
  const Wrapper = makeWrapper();
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (): Promise<FieldErrors | undefined> => undefined,
    });
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

describe("<SearchInput>", () => {
  it("defaults to the 'q' source and shows the search placeholder", () => {
    setup(<SearchInput />, { defaultValues: { q: "" } });
    const input = elementOf(
      document.querySelector("input[name='q'], input#q, input"),
      HTMLInputElement,
    );
    expect(input).toBeTruthy();
    expect(input.getAttribute("placeholder")).toBe("Search");
  });

  it("throws when a label prop is passed", () => {
    expect(() =>
      setup(<SearchInput label="Nope" />, { defaultValues: { q: "" } }),
    ).toThrow(/isn't designed to be used with a label/);
  });

  it("shows a clear button only when the value is non-empty", () => {
    setup(<SearchInput />, { defaultValues: { q: "hello" } });
    expect(screen.getByRole("button", { name: /clear search/i })).toBeTruthy();
  });

  it("hides the clear button for an empty value", () => {
    setup(<SearchInput />, { defaultValues: { q: "" } });
    expect(screen.queryByRole("button", { name: /clear search/i })).toBeNull();
  });

  it("clears the value when the clear button is clicked", async () => {
    setup(<SearchInput />, { defaultValues: { q: "hello" } });
    const input = elementOf(
      screen.getByDisplayValue("hello"),
      HTMLInputElement,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    });
    expect(input.value).toBe("");
    // Button disappears once value is empty.
    expect(screen.queryByRole("button", { name: /clear search/i })).toBeNull();
  });

  it("suppresses the clear button when disableClearable", () => {
    setup(<SearchInput disableClearable />, {
      defaultValues: { q: "hello" },
    });
    expect(screen.queryByRole("button", { name: /clear search/i })).toBeNull();
  });
});
