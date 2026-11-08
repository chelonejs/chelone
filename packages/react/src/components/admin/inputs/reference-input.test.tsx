/**
 * P7c-T2 — `<ReferenceInput>` ported onto chelone `useReferenceInput`.
 *
 * Builds the live choices controller for a to-one FK relationship and provides
 * it (plus the reference `<ResourceContextProvider>`) to a child input (default
 * `<AutocompleteInput>`). Verifies: the child resolves choices from the fetched
 * reference resource, the selected record is resolved via the controller, a
 * non-`id` `lookupKey` resolves via a `getList` filter, and passing a `validate`
 * prop throws (validators belong on the child).
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { ReferenceInput } from "./reference-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.action.search": "Search...",
    "chelone.navigation.no_results": "No matching item found.",
  }),
};

const authorRecords = [
  { id: 1, name: "Alice", code: "AL" },
  { id: 2, name: "Bob", code: "BO" },
  { id: 3, name: "Carol", code: "CA" },
];

function makeProviders() {
  const i18n = createI18n({ locale: "en", messages });
  const dataProvider = fakeDataProvider({
    authors: structuredClone(authorRecords),
    posts: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "authors",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        {children}
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
  return { Providers, dataProvider };
}

function setup(
  ui: ReactNode,
  defaultValues: Record<string, unknown>,
  providers: ReturnType<typeof makeProviders>,
) {
  const { Providers } = providers;
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm({ defaultValues, save: async () => undefined });
    submitRef.current = form.submit;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  const view = render(
    <Providers>
      <FormHost>{ui}</FormHost>
    </Providers>,
  );
  return { view, submitRef, dataProvider: providers.dataProvider };
}

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("<ReferenceInput>", () => {
  it("fetches the reference resource and lists its records as choices", async () => {
    const providers = makeProviders();
    setup(
      <ReferenceInput source="author_id" reference="authors" />,
      { author_id: null },
      providers,
    );
    // Open the default AutocompleteInput dropdown.
    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => {
      const listbox = screen.getByRole("listbox");
      expect(listbox.textContent).toContain("Alice");
      expect(listbox.textContent).toContain("Bob");
      expect(listbox.textContent).toContain("Carol");
    });
  });

  it("resolves the selected record for the current field value", async () => {
    const providers = makeProviders();
    setup(
      <ReferenceInput source="author_id" reference="authors" />,
      { author_id: 2 },
      providers,
    );
    // The trigger shows the resolved representation of author 2 (Bob).
    await waitFor(() => {
      expect(screen.getByRole("combobox").textContent).toContain("Bob");
    });
  });

  it("resolves the selected record via a getList filter for a non-id lookupKey", async () => {
    const providers = makeProviders();
    const getListSpy = vi.spyOn(providers.dataProvider, "getList");
    setup(
      <ReferenceInput
        source="author_code"
        reference="authors"
        lookupKey="code"
      />,
      { author_code: "BO" },
      providers,
    );
    await waitFor(() => {
      expect(
        getListSpy.mock.calls.some(
          ([, params]) => params?.filter?.code === "BO",
        ),
      ).toBe(true);
    });
  });

  it("throws when a validate prop is passed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const providers = makeProviders();
    expect(() =>
      setup(
        <ReferenceInput
          source="author_id"
          reference="authors"
          // @ts-expect-error validate is `never` on ReferenceInput
          validate={() => undefined}
        />,
        { author_id: null },
        providers,
      ),
    ).toThrow(/does not accept a validate prop/);
    spy.mockRestore();
  });
});
