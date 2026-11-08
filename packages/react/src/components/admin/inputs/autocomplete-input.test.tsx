/**
 * P7c-T1 — `<AutocompleteInput>` ported onto chelone `useChoicesContext` +
 * `useChoices` + `useInput` + `ui/command` + `ui/popover` + `ui/field` +
 * `<ValidationError>`. Scalar value, searchable dropdown. Verifies the trigger,
 * opening lists choices, selecting writes the value, the reference path calls
 * `setFilters` on typing, the required marker, and error surfacing.
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
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChoicesContextProvider } from "../../../choices-hooks";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { AutocompleteInput } from "./autocomplete-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    // The ported input reads its own `chelone.*` label keys; a real app
    // registers them in its catalog (chelone's translate echoes the raw key on
    // a miss and does not honor a `{ _: default }` fallback).
    "chelone.action.search": "Search...",
    "chelone.navigation.no_results": "No matching item found.",
  }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  const registry = createResourceRegistry();
  registry.register({
    name: "authors",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
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

function referenceCtx(setFilters: (f: unknown) => void) {
  return {
    allChoices: choices,
    availableChoices: choices,
    selectedChoices: [],
    total: 3,
    isPending: false,
    isFetching: false,
    error: null,
    page: 1,
    perPage: 25,
    sort: { field: "id", order: "DESC" as const },
    filter: {},
    hasNextPage: false,
    hasPreviousPage: false,
    resource: "authors",
    source: "author_id",
    isFromReference: true,
    setPage: () => {},
    setPerPage: () => {},
    setSort: () => {},
    setFilters,
    setValue: () => {},
    refetch: () => {},
  };
}

afterEach(() => cleanup());

describe("<AutocompleteInput>", () => {
  it("renders a labelled combobox trigger", () => {
    setup(
      <AutocompleteInput
        source="category"
        choices={choices}
        label="Category"
      />,
      { defaultValues: { category: "" } },
    );
    expect(screen.getByText("Category")).toBeTruthy();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("shows the selected choice text in the trigger", () => {
    setup(<AutocompleteInput source="category" choices={choices} />, {
      defaultValues: { category: "lifestyle" },
    });
    expect(screen.getByRole("combobox").textContent).toContain("Lifestyle");
  });

  it("opens and lists all choices", () => {
    setup(<AutocompleteInput source="category" choices={choices} />, {
      defaultValues: { category: "" },
    });
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Tech")).toBeTruthy();
    expect(within(listbox).getByText("Lifestyle")).toBeTruthy();
    expect(within(listbox).getByText("People")).toBeTruthy();
  });

  it("writes the selected value back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ category: string }>(
      <AutocompleteInput source="category" choices={choices} />,
      { defaultValues: { category: "" }, onData },
    );
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByText("People"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ category: "people" });
  });

  it("filters the visible choices when typing (client-side, inline choices)", () => {
    setup(<AutocompleteInput source="category" choices={choices} />, {
      defaultValues: { category: "" },
    });
    fireEvent.click(screen.getByRole("combobox"));
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "life" } });
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).queryByText("Lifestyle")).toBeTruthy();
    expect(within(listbox).queryByText("Tech")).toBeNull();
  });

  it("calls setFilters (debounced) on typing inside a reference context", async () => {
    vi.useFakeTimers();
    const setFilters = vi.fn();
    render(
      // makeWrapper already provides providers via setup, but the reference ctx
      // path needs an ambient ChoicesContextProvider — render it directly.
      <ChoicesContextProvider value={referenceCtx(setFilters)}>
        <AutocompleteInput debounce={250} />
      </ChoicesContextProvider>,
      { wrapper: makeWrapperForm({ author_id: "" }) },
    );
    fireEvent.click(screen.getByRole("combobox"));
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "te" } });
    expect(setFilters).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(setFilters).toHaveBeenCalledWith({ q: "te" });
    vi.useRealTimers();
  });

  it("renders the required marker for a required validator", () => {
    setup(
      <AutocompleteInput
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
      <AutocompleteInput
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

/** A form+providers wrapper for the reference-context test (choices come from ctx). */
function makeWrapperForm(defaultValues: Record<string, unknown>) {
  const Providers = makeWrapper();
  return ({ children }: { children: ReactNode }) => {
    function FormHost({ children: inner }: { children: ReactNode }) {
      const form = useForm({ defaultValues, save: async () => undefined });
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          {inner}
        </CheloneFormProvider>
      );
    }
    return (
      <Providers>
        <FormHost>{children}</FormHost>
      </Providers>
    );
  };
}
