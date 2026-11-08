/**
 * P7g tests: `<Toolbar>` — the default form action bar.
 *
 * Asserts: mounted inside an `<Edit>`, the default toolbar renders both a Save
 * and a Delete button; passing children replaces the defaults.
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
import { SaveButton } from "../buttons/save-button";
import { TextInput } from "../inputs/text-input";
import { Edit } from "../views/edit";
import { Toolbar } from "./toolbar";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.save": "Save",
        "chelone.action.delete": "Delete",
      }),
    },
  });
}

function Providers({ children }: { children: ReactNode }) {
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
      dataProvider={fakeDataProvider({ posts: [{ id: 1, title: "One" }] })}
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

describe("<Toolbar>", () => {
  it("renders a Save and a Delete button by default", async () => {
    render(
      <Providers>
        <Edit>
          <TextInput source="title" />
          <Toolbar />
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save/i })).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: /delete/i })).toBeTruthy();
    expect(screen.getByRole("toolbar")).toBeTruthy();
  });

  it("renders custom children instead of the defaults", async () => {
    render(
      <Providers>
        <Edit>
          <TextInput source="title" />
          <Toolbar>
            <SaveButton label="Save only" />
          </Toolbar>
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save only/i })).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });
});
