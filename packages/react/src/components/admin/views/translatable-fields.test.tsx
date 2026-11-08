/**
 * `<TranslatableFields>` shows one field in several locales, one tab per
 * locale: a child `<TextField source="title" />` reads `title.en` in one tab
 * and `title.fr` in the next. Mounted under the providers a show view gives
 * and asserted through DOM and roles.
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
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { ArrayField } from "../fields/array-field";
import { TextField } from "../fields/text-field";
import { Show } from "./show";
import { TranslatableFields } from "./translatable-fields";

const post = {
  id: 1,
  title: { en: "Hello", fr: "Bonjour" },
  body: { en: "World", fr: "Monde" },
};

function makeI18n(messages: Record<string, string> = {}) {
  return createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
}

/** Mount `ui` under a resource and, unless `record` is null, a record. */
function mount(
  ui: ReactNode,
  {
    record = post,
    resource = "posts",
    messages,
  }: {
    record?: Record<string, unknown> | null;
    resource?: string | null;
    messages?: Record<string, string>;
  } = {},
) {
  return render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={makeI18n(messages)}
    >
      <ResourceContextProvider value={resource ?? undefined}>
        <RecordContextProvider value={record ?? undefined}>
          {ui}
        </RecordContextProvider>
      </ResourceContextProvider>
    </CheloneProvider>,
  );
}

function panel(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no element with id ${id}`);
  return el;
}

/** Radix tabs activate on mouse down, not click. */
function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("TranslatableFields", () => {
  it("TranslatableFields shows the default locale's value and switches on a tab click", () => {
    mount(
      <TranslatableFields locales={["en", "fr"]}>
        <TextField source="title" />
      </TranslatableFields>,
    );
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "En",
      "Fr",
    ]);
    expect(panel("translatable-content-en").hidden).toBe(false);
    expect(
      within(panel("translatable-content-en")).getByText("Hello"),
    ).toBeTruthy();
    expect(panel("translatable-content-fr").hidden).toBe(true);
    expect(
      within(panel("translatable-content-fr")).getByText("Bonjour"),
    ).toBeTruthy();

    selectTab("Fr");

    expect(panel("translatable-content-en").hidden).toBe(true);
    expect(panel("translatable-content-fr").hidden).toBe(false);
    expect(
      panel("translatable-content-fr").getAttribute("aria-labelledby"),
    ).toBe("translatable-header-fr");
    expect(screen.getByRole("tab", { name: "Fr" }).id).toBe(
      "translatable-header-fr",
    );
  });

  it("TranslatableFields reads a nested translatable value inside an array item", () => {
    function Rows() {
      const { data = [] } = useListContext();
      return (
        <>
          {data.map((row) => (
            <RecordContextProvider key={row.id} value={row}>
              <TranslatableFields
                locales={["en", "fr"]}
                groupKey={`row${row.id}`}
              >
                <TextField source="details.label" />
              </TranslatableFields>
            </RecordContextProvider>
          ))}
        </>
      );
    }
    mount(
      <ArrayField source="items">
        <Rows />
      </ArrayField>,
      {
        record: {
          id: 1,
          items: [
            { id: 10, details: { label: { en: "One", fr: "Un" } } },
            { id: 20, details: { label: { en: "Two", fr: "Deux" } } },
          ],
        },
      },
    );
    expect(
      within(panel("translatable-content-row10en")).getByText("One"),
    ).toBeTruthy();
    expect(
      within(panel("translatable-content-row10fr")).getByText("Un"),
    ).toBeTruthy();
    expect(
      within(panel("translatable-content-row20fr")).getByText("Deux"),
    ).toBeTruthy();
  });

  it("TranslatableFields labels several children with their resource field labels", () => {
    mount(
      <TranslatableFields locales={["en", "fr"]}>
        <TextField source="title" />
        <TextField source="body" />
      </TranslatableFields>,
      { messages: { "resources.posts.fields.title": "Headline" } },
    );
    for (const locale of ["en", "fr"]) {
      const scope = within(panel(`translatable-content-${locale}`));
      expect(scope.getByText("Headline")).toBeTruthy();
      expect(scope.getByText("Body")).toBeTruthy();
    }
    expect(
      within(panel("translatable-content-fr")).getByText("Bonjour"),
    ).toBeTruthy();
    expect(
      within(panel("translatable-content-fr")).getByText("Monde"),
    ).toBeTruthy();
  });

  it("TranslatableFields shows no label for a single child", () => {
    mount(
      <TranslatableFields locales={["en", "fr"]}>
        <TextField source="title" />
      </TranslatableFields>,
      { messages: { "resources.posts.fields.title": "Headline" } },
    );
    expect(screen.queryByText("Headline")).toBeNull();
    expect(screen.queryByText("Title")).toBeNull();
    expect(document.querySelector("label")).toBeNull();
  });

  it("TranslatableFields record prop shows that record instead of the ambient one", () => {
    mount(
      <TranslatableFields
        locales={["en", "fr"]}
        record={{ id: 2, title: { en: "Other", fr: "Autre" } }}
      >
        <TextField source="title" />
      </TranslatableFields>,
    );
    expect(
      within(panel("translatable-content-en")).getByText("Other"),
    ).toBeTruthy();
    expect(screen.queryByText("Hello")).toBeNull();
  });

  it("TranslatableFields keeps a nested object whose key equals a locale code", () => {
    mount(
      <TranslatableFields locales={["en", "id"]}>
        <TextField source="author.name" />
      </TranslatableFields>,
      {
        record: {
          id: 1,
          title: { en: "Hi", id: "Halo" },
          author: { id: 3, name: "Ann" },
        },
      },
    );
    expect(
      within(panel("translatable-content-id")).getByText("Ann"),
    ).toBeTruthy();
  });

  it("TranslatableFields throws without a record", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      mount(
        <TranslatableFields locales={["en", "fr"]}>
          <TextField source="title" />
        </TranslatableFields>,
        { record: null },
      ),
    ).toThrow(/needs a record/);
    error.mockRestore();
  });

  it("TranslatableFields throws without a resource", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      mount(
        <TranslatableFields locales={["en", "fr"]}>
          <TextField source="title" />
        </TranslatableFields>,
        { resource: null },
      ),
    ).toThrow(/needs a resource/);
    error.mockRestore();
  });

  it("TranslatableFields labels a tab from chelone.locales when translated and capitalizes the code otherwise", () => {
    mount(
      <TranslatableFields locales={["en", "fr"]}>
        <TextField source="title" />
      </TranslatableFields>,
      { messages: { "chelone.locales.en": "English" } },
    );
    expect(screen.getByRole("tab", { name: "English" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Fr" })).toBeTruthy();
  });

  it("TranslatableFields selector prop replaces the default tabs", () => {
    mount(
      <TranslatableFields
        locales={["en", "fr"]}
        selector={<div data-testid="custom-selector" />}
      >
        <TextField source="title" />
      </TranslatableFields>,
    );
    expect(screen.getByTestId("custom-selector")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText("Hello")).toBeTruthy();
    expect(screen.getByText("Bonjour")).toBeTruthy();
  });

  it("TranslatableFields inside Show shows each locale of the loaded record", async () => {
    const registry = createResourceRegistry();
    registry.register({
      name: "posts",
      hasList: true,
      hasCreate: true,
      hasEdit: true,
      hasShow: true,
    });
    render(
      <CheloneProvider
        dataProvider={fakeDataProvider({ posts: [post] })}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={makeI18n()}
      >
        <ResourceRegistryProvider registry={registry}>
          <RouterAdapterProvider adapter={reactRouterAdapter}>
            <MemoryRouter initialEntries={["/1/show"]}>
              <ResourceContextProvider value="posts">
                <Routes>
                  <Route
                    path=":id/show"
                    element={
                      <Show title={false}>
                        <TranslatableFields locales={["en", "fr"]}>
                          <TextField source="title" />
                        </TranslatableFields>
                      </Show>
                    }
                  />
                </Routes>
              </ResourceContextProvider>
            </MemoryRouter>
          </RouterAdapterProvider>
        </ResourceRegistryProvider>
      </CheloneProvider>,
    );
    await waitFor(() =>
      expect(
        within(panel("translatable-content-en")).getByText("Hello"),
      ).toBeTruthy(),
    );
    expect(
      within(panel("translatable-content-fr")).getByText("Bonjour"),
    ).toBeTruthy();
  });
});
