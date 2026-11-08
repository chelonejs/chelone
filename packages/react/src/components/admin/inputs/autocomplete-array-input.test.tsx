/**
 * P7c-T1 — `<AutocompleteArrayInput>` ported onto chelone `useChoicesContext` +
 * `useChoices` + `useInput` + `ui/command` + `ui/popover` + `ui/badge` +
 * `ui/field` + `<ValidationError>`. Array value, searchable, selected items as
 * removable badges. Verifies the input, opening lists unselected choices,
 * selecting appends, removing a badge unselects, reference typing calls
 * setFilters, required marker, and error surfacing.
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
import { AutocompleteArrayInput } from "./autocomplete-array-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.action.search": "Search...",
    "chelone.action.remove": "Remove",
    "chelone.navigation.no_results": "No matching item found.",
  }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  const registry = createResourceRegistry();
  registry.register({
    name: "tags",
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
    resource: "tags",
    source: "tag_ids",
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

describe("<AutocompleteArrayInput>", () => {
  it("renders a labelled search input", () => {
    setup(
      <AutocompleteArrayInput source="tags" choices={choices} label="Tags" />,
      { defaultValues: { tags: [] } },
    );
    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search...")).toBeTruthy();
  });

  it("shows selected values as badges", () => {
    setup(<AutocompleteArrayInput source="tags" choices={choices} />, {
      defaultValues: { tags: ["tech", "people"] },
    });
    expect(screen.getByText("Tech")).toBeTruthy();
    expect(screen.getByText("People")).toBeTruthy();
  });

  it("lists unselected choices when focused", () => {
    setup(<AutocompleteArrayInput source="tags" choices={choices} />, {
      defaultValues: { tags: ["tech"] },
    });
    fireEvent.focus(screen.getByPlaceholderText("Search..."));
    const listbox = screen.getByRole("listbox");
    // Tech is selected → not offered in the dropdown.
    expect(within(listbox).queryByText("Tech")).toBeNull();
    expect(within(listbox).getByText("Lifestyle")).toBeTruthy();
    expect(within(listbox).getByText("People")).toBeTruthy();
  });

  it("appends a value to the array when a choice is selected", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <AutocompleteArrayInput source="tags" choices={choices} />,
      { defaultValues: { tags: [] }, onData },
    );
    fireEvent.focus(screen.getByPlaceholderText("Search..."));
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByText("Lifestyle"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["lifestyle"] });
  });

  it("removes a value when its badge remove button is clicked", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <AutocompleteArrayInput source="tags" choices={choices} />,
      { defaultValues: { tags: ["tech", "people"] }, onData },
    );
    // The "Remove" label sits in an sr-only span inside each badge's button;
    // click the first badge's remove button (first badge = Tech).
    const firstRemoveLabel = screen.getAllByText("Remove")[0];
    const firstRemove = firstRemoveLabel?.closest("button");
    if (!firstRemove) throw new Error("remove button not found");
    fireEvent.click(firstRemove);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["people"] });
  });

  it("calls setFilters (debounced) on typing inside a reference context", async () => {
    vi.useFakeTimers();
    const setFilters = vi.fn();
    render(
      <ChoicesContextProvider value={referenceCtx(setFilters)}>
        <AutocompleteArrayInput debounce={250} />
      </ChoicesContextProvider>,
      { wrapper: makeWrapperForm({ tag_ids: [] }) },
    );
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "te" } });
    expect(setFilters).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(setFilters).toHaveBeenCalledWith({ q: "te" }, true);
    vi.useRealTimers();
  });

  it("renders the required marker for a required validator", () => {
    setup(
      <AutocompleteArrayInput
        source="tags"
        choices={choices}
        validate={required()}
        label="Tags"
      />,
      { defaultValues: { tags: [] } },
    );
    expect(screen.getByText("Tags").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ tags: string[] }>(
      <AutocompleteArrayInput
        source="tags"
        choices={choices}
        validate={required()}
        label="Tags"
      />,
      { defaultValues: { tags: [] } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});

/** A form+providers wrapper for the reference-context test (choices from ctx). */
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
