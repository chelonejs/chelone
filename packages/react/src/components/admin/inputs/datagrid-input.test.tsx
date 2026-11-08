/**
 * P7c-T2 — `<DatagridInput>` ported onto chelone `useChoicesContext` +
 * `useInput`. Renders choices as a selectable table (row checkboxes + a
 * select-all header checkbox); the form value is an array of selected ids.
 * Works with inline `choices` OR inside a `<ReferenceArrayInput>` (ambient
 * choices context). Verifies rows render from choices, a row checkbox toggles
 * its id into/out of the array, select-all selects every choice, and a
 * pre-selected value renders checked.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
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
import { DatagridInput } from "./datagrid-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.action.select_all": "Select all",
    "chelone.action.select_row": "Select this row",
  }),
};

const choices = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];

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

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("<DatagridInput>", () => {
  it("renders a table row per choice", () => {
    setup(<DatagridInput source="tag_ids" choices={choices} />, {
      defaultValues: { tag_ids: [] },
    });
    expect(screen.getByText("Tech")).toBeTruthy();
    expect(screen.getByText("News")).toBeTruthy();
    expect(screen.getByText("Lifestyle")).toBeTruthy();
  });

  it("toggles a row id into the form array on checkbox click", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tag_ids: number[] }>(
      <DatagridInput source="tag_ids" choices={choices} />,
      { defaultValues: { tag_ids: [] }, onData },
    );
    const newsRow = elementOf(
      screen.getByText("News").closest("tr"),
      HTMLTableRowElement,
    );
    fireEvent.click(within(newsRow).getByRole("checkbox"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tag_ids: [2] });
  });

  it("toggles a selected row back out of the array", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tag_ids: number[] }>(
      <DatagridInput source="tag_ids" choices={choices} />,
      { defaultValues: { tag_ids: [2] }, onData },
    );
    const newsRow = elementOf(
      screen.getByText("News").closest("tr"),
      HTMLTableRowElement,
    );
    fireEvent.click(within(newsRow).getByRole("checkbox"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tag_ids: [] });
  });

  it("renders a pre-selected value as a checked row", () => {
    setup<{ tag_ids: number[] }>(
      <DatagridInput source="tag_ids" choices={choices} />,
      { defaultValues: { tag_ids: [1] } },
    );
    const techRow = elementOf(
      screen.getByText("Tech").closest("tr"),
      HTMLTableRowElement,
    );
    const checkbox = within(techRow).getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("select-all selects every choice id", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tag_ids: number[] }>(
      <DatagridInput source="tag_ids" choices={choices} />,
      { defaultValues: { tag_ids: [] }, onData },
    );
    const [header] = screen.getAllByRole("columnheader");
    fireEvent.click(within(defined(header)).getByRole("checkbox"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tag_ids: [1, 2, 3] });
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ tag_ids: number[] }>(
      <DatagridInput
        source="tag_ids"
        choices={choices}
        validate={required()}
      />,
      { defaultValues: { tag_ids: [] } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });

  it("reads choices from an ambient reference ChoicesContext", () => {
    render(
      <ChoicesContextProvider
        value={{
          allChoices: choices,
          availableChoices: choices,
          selectedChoices: [],
          total: 3,
          isPending: false,
          isFetching: false,
          error: null,
          page: 1,
          perPage: 25,
          sort: { field: "id", order: "DESC" },
          filter: {},
          hasNextPage: false,
          hasPreviousPage: false,
          resource: "tags",
          source: "tag_ids",
          isFromReference: true,
          setPage: () => {},
          setPerPage: () => {},
          setSort: () => {},
          setFilters: () => {},
          setValue: () => {},
          refetch: () => {},
        }}
      >
        <DatagridInput />
      </ChoicesContextProvider>,
      { wrapper: makeFormWrapper({ tag_ids: [] }) },
    );
    expect(screen.getByText("Tech")).toBeTruthy();
    expect(screen.getByText("Lifestyle")).toBeTruthy();
  });
});

/** A form+providers wrapper for the reference-context test. */
function makeFormWrapper(defaultValues: Record<string, unknown>) {
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
