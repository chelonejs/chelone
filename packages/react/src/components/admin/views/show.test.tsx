/**
 * P7e-T2 tests: `<Show>` — the show-page shell.
 *
 * Wires `useShowController` (id from the route params) → publishes `ShowContext`
 * + `RecordContext(record)` (no save — show is read-only). Asserts: the fetched
 * record renders through a display field, the title resolves from the record
 * representation, and the `ShowContext` is published.
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useShowContext } from "../../../record-view-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TextField } from "../fields/text-field";
import { Show } from "./show";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [{ id: 1, title: "Hello World" }],
  });
}

function Providers({
  children,
  path = ":id/show",
  entry = "/1/show",
}: {
  children: ReactNode;
  path?: string;
  entry?: string;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
      dataProvider={makeDataProvider()}
      queryClient={queryClient}
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={[entry]}>
            <ResourceContextProvider value="posts">
              <Routes>
                <Route path={path} element={children} />
              </Routes>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<Show>", () => {
  it("renders the fetched record through a display field", async () => {
    render(
      <Providers>
        <Show title={false}>
          <TextField source="title" />
        </Show>
      </Providers>,
    );
    expect(await screen.findByText("Hello World")).toBeTruthy();
  });

  it("renders a heading from the record representation", async () => {
    render(
      <Providers>
        <Show>
          <TextField source="title" />
        </Show>
      </Providers>,
    );
    // Default representation prefers `title` → "Hello World".
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Hello World" })).toBeTruthy(),
    );
  });

  it("honors a title prop over the default heading", async () => {
    render(
      <Providers>
        <Show title="My Post">
          <TextField source="title" />
        </Show>
      </Providers>,
    );
    await screen.findByText("Hello World");
    expect(screen.getByRole("heading", { name: "My Post" })).toBeTruthy();
  });

  it("publishes a ShowContext with the record (no save)", async () => {
    const seen: { title?: string; resource?: string; hasSave?: boolean } = {};
    function Probe() {
      const show = useShowContext<{ id: number; title: string }>();
      seen.title = show.record?.title;
      seen.resource = show.resource;
      seen.hasSave = "save" in show;
      return null;
    }
    render(
      <Providers>
        <Show>
          <Probe />
          <TextField source="title" />
        </Show>
      </Providers>,
    );
    await waitFor(() => expect(seen.title).toBe("Hello World"));
    expect(seen.resource).toBe("posts");
    expect(seen.hasSave).toBe(false);
  });

  it("Show throws without an id prop or a route id", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      expect(() =>
        render(
          <Providers path="/" entry="/">
            <Show />
          </Providers>,
        ),
      ).toThrow(/Show.*`id`.*`:id`/);
    } finally {
      consoleError.mockRestore();
    }
  });
});
