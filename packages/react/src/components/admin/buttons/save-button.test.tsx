/**
 * P7g tests: `<SaveButton>` — the composed-form submit trigger.
 *
 * Mounted inside a real `<Edit>` (which publishes the `SaveContext` +
 * `CheloneFormProvider`), it asserts: renders a Save button, persists the
 * form values through the data provider on click, respects the `disabled`
 * prop, and renders a custom label.
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TextInput } from "../inputs/text-input";
import { Edit } from "../views/edit";
import { SaveButton } from "./save-button";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: { en: defineMessages({ "chelone.action.save": "Save" }) },
  });
}

function makeDataProvider() {
  return fakeDataProvider({ posts: [{ id: 1, title: "Original" }] });
}

function Providers({
  children,
  dataProvider = makeDataProvider(),
}: {
  children: ReactNode;
  dataProvider?: ReturnType<typeof makeDataProvider>;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: true,
    hasEdit: true,
    hasShow: true,
  });
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/1"]}>
            <ResourceContextProvider value="posts">
              <Routes>
                <Route path=":id" element={children} />
              </Routes>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<SaveButton>", () => {
  it("renders a Save button", async () => {
    render(
      <Providers>
        <Edit>
          <TextInput source="title" />
          <SaveButton />
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save/i })).toBeTruthy(),
    );
  });

  it("persists the current form values through the data provider on click", async () => {
    const dataProvider = makeDataProvider();
    render(
      <Providers dataProvider={dataProvider}>
        <Edit>
          <TextInput source="title" />
          <SaveButton />
        </Edit>
      </Providers>,
    );
    const input = elementOf(
      await screen.findByLabelText(/title/i),
      HTMLInputElement,
    );
    await waitFor(() => expect(input.value).toBe("Original"));

    fireEvent.change(input, { target: { value: "Updated" } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(async () => {
      const { data } = await dataProvider.getOne("posts", { id: 1 });
      expect(data).toMatchObject({ title: "Updated" });
    });
  });

  it("respects the disabled prop", async () => {
    render(
      <Providers>
        <Edit>
          <TextInput source="title" />
          <SaveButton disabled alwaysEnable />
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(
        elementOf(
          screen.getByRole("button", { name: /save/i }),
          HTMLButtonElement,
        ).disabled,
      ).toBe(true),
    );
  });

  it("renders a custom label", async () => {
    render(
      <Providers>
        <Edit>
          <TextInput source="title" />
          <SaveButton label="Save changes" />
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /save changes/i }),
      ).toBeTruthy(),
    );
  });
});
