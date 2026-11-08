/**
 * P7c-T2 — `<ReferenceArrayInput>` ported onto chelone `useReferenceInput`.
 *
 * The to-many variant of `<ReferenceInput>`: builds the live choices controller
 * for an array of FK ids and provides it (plus the reference
 * `<ResourceContextProvider>`) to a child multi-select input (default
 * `<AutocompleteArrayInput>`). Verifies the child lists the fetched reference
 * records, the currently-selected array is resolved via the controller, adding
 * a choice writes the id into the array, and passing >1 child throws.
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
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { ReferenceArrayInput } from "./reference-array-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.action.search": "Search...",
    "chelone.navigation.no_results": "No matching item found.",
    "chelone.action.remove": "Remove",
  }),
};

const tagRecords = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];

function makeProviders() {
  const i18n = createI18n({ locale: "en", messages });
  const dataProvider = fakeDataProvider({
    tags: structuredClone(tagRecords),
    posts: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "tags",
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
  const dataRef: { current: Record<string, unknown> | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm({
      defaultValues,
      save: async (data) => {
        dataRef.current = data;
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
  render(
    <Providers>
      <FormHost>{ui}</FormHost>
    </Providers>,
  );
  return { submitRef, dataRef };
}

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("<ReferenceArrayInput>", () => {
  it("fetches the reference resource and lists its records as choices", async () => {
    const providers = makeProviders();
    setup(
      <ReferenceArrayInput source="tag_ids" reference="tags" />,
      { tag_ids: [] },
      providers,
    );
    fireEvent.focus(screen.getByPlaceholderText("Search..."));
    await waitFor(() => {
      const listbox = screen.getByRole("listbox");
      expect(within(listbox).getByText("Tech")).toBeTruthy();
      expect(within(listbox).getByText("News")).toBeTruthy();
      expect(within(listbox).getByText("Lifestyle")).toBeTruthy();
    });
  });

  it("resolves the currently-selected array as badges", async () => {
    const providers = makeProviders();
    setup(
      <ReferenceArrayInput source="tag_ids" reference="tags" />,
      { tag_ids: [2] },
      providers,
    );
    // The selected tag (News) shows as a removable badge on the trigger.
    await waitFor(() => {
      expect(screen.getByText("News")).toBeTruthy();
    });
  });

  it("adds a selected choice id to the form array", async () => {
    const providers = makeProviders();
    const { submitRef, dataRef } = setup(
      <ReferenceArrayInput source="tag_ids" reference="tags" />,
      { tag_ids: [] },
      providers,
    );
    fireEvent.focus(screen.getByPlaceholderText("Search..."));
    await waitFor(() => {
      expect(
        within(screen.getByRole("listbox")).getByText("Tech"),
      ).toBeTruthy();
    });
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Tech"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(dataRef.current?.tag_ids).toEqual([1]);
  });

  it("throws when given more than one child", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const providers = makeProviders();
    expect(() =>
      setup(
        // @ts-expect-error two children — ReferenceArrayInput accepts one
        <ReferenceArrayInput source="tag_ids" reference="tags">
          <span />
          <span />
        </ReferenceArrayInput>,
        { tag_ids: [] },
        providers,
      ),
    ).toThrow(/only accepts a single child/);
    spy.mockRestore();
  });
});
