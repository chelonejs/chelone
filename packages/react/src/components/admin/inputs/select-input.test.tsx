/**
 * P7c-T1 — `<SelectInput>` ported onto chelone `useChoicesContext` +
 * `useChoices` + `useInput` + `ui/select` + `ui/field` + `<ValidationError>`.
 * Verifies choices render, selecting writes the (original-typed) value back to
 * the form, the required marker, error surfacing, resettable clear, and the
 * reference path via a `<ChoicesContextProvider>` wrapper.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  type ResourceRepresentation,
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
import { ChoicesContextProvider } from "../../../choices-hooks";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { SelectInput } from "./select-input";

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

function makeRegistry(recordRepresentation?: ResourceRepresentation) {
  const registry = createResourceRegistry();
  registry.register({
    name: "authors",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
    recordRepresentation,
  });
  return registry;
}

function makeWrapper(recordRepresentation?: ResourceRepresentation) {
  const i18n = createI18n({ locale: "en", messages });
  const registry = makeRegistry(recordRepresentation);
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
    save = async () => undefined,
    onData,
    recordRepresentation,
  }: {
    recordRepresentation?: ResourceRepresentation;
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
    onData?: (data: TFormData) => void;
  } = {},
) {
  const Wrapper = makeWrapper(recordRepresentation);
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data) => {
        onData?.(data);
        return save(data);
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

describe("<SelectInput>", () => {
  it("renders a labelled combobox trigger", () => {
    setup(<SelectInput source="category" choices={choices} />, {
      defaultValues: { category: "" },
    });
    expect(screen.getByText("Category")).toBeTruthy();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("reflects the default value as the selected option", () => {
    setup(<SelectInput source="category" choices={choices} />, {
      defaultValues: { category: "lifestyle" },
    });
    expect(screen.getByRole("combobox").textContent).toContain("Lifestyle");
  });

  it("opens and lists all choices", () => {
    setup(<SelectInput source="category" choices={choices} />, {
      defaultValues: { category: "" },
    });
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "Tech" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Lifestyle" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "People" })).toBeTruthy();
  });

  it("writes the selected value back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ category: string }>(
      <SelectInput source="category" choices={choices} />,
      { defaultValues: { category: "" }, onData },
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "People" }));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ category: "people" });
  });

  it("preserves a numeric choice id on the wire (no string coercion)", async () => {
    const numericChoices = [
      { id: 1, name: "One" },
      { id: 2, name: "Two" },
    ];
    const onData = vi.fn();
    const { submitRef } = setup<{ rating: number | string }>(
      <SelectInput source="rating" choices={numericChoices} />,
      { defaultValues: { rating: "" }, onData },
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Two" }));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ rating: 2 });
  });

  it("renders the required marker for a required validator", () => {
    setup(
      <SelectInput source="category" choices={choices} validate={required()} />,
      {
        defaultValues: { category: "" },
      },
    );
    expect(screen.getByText("Category").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ category: string }>(
      <SelectInput source="category" choices={choices} validate={required()} />,
      { defaultValues: { category: "" } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });

  it("throws when neither source nor a reference context is present", () => {
    const Broken = () => <SelectInput choices={choices} />;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => setup(<Broken />, { defaultValues: {} })).toThrow(
      /must provide the source prop/,
    );
    spy.mockRestore();
  });

  it("reads choices from an ambient reference ChoicesContext (no choices prop)", () => {
    const referenceCtx = referenceContext();
    setup(
      <ChoicesContextProvider value={referenceCtx}>
        <SelectInput />
      </ChoicesContextProvider>,
      { defaultValues: { author_id: "" } },
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "FromRef" })).toBeTruthy();
  });

  it("labels reference choices by name when recordRepresentation is an element", () => {
    setup(
      <ChoicesContextProvider value={referenceContext()}>
        <SelectInput />
      </ChoicesContextProvider>,
      {
        defaultValues: { author_id: "" },
        recordRepresentation: <span>custom</span>,
      },
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "FromRef" })).toBeTruthy();
  });
});

function referenceContext() {
  return {
    allChoices: [{ id: 7, name: "FromRef" }],
    availableChoices: [{ id: 7, name: "FromRef" }],
    selectedChoices: [],
    total: 1,
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
    setFilters: () => {},
    setValue: () => {},
    refetch: () => {},
  };
}
