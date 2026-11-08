/**
 * P7e-T2 tests: `<List>` — the list-page shell.
 *
 * Wires `useListController` → publishes the ambient `ListContext` (+ the
 * `ResourceContext` from `<Resource>`), renders a title + the children (a
 * `<DataTable>`) fed by the controller's `data`. Fetches from a
 * `fakeDataProvider`; asserts rows render, the title resolves from the resource
 * label, the empty state shows when the provider returns nothing, and the
 * ambient `ListContext` is readable by descendants.
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
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { DataTable } from "../list/data-table";
import { List } from "./list";

afterEach(cleanup);

const POSTS = [
  { id: 1, title: "Alpha" },
  { id: 2, title: "Beta" },
];

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.list": "{name}",
        "chelone.navigation.no_results": "No results found",
      }),
    },
  });
}

function Providers({
  children,
  posts = POSTS,
}: {
  children: ReactNode;
  posts?: Array<{ id: number } & Record<string, unknown>>;
}) {
  const dataProvider = fakeDataProvider({ posts });
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
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <ResourceContextProvider value="posts">
              {children}
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

const Table = (
  <DataTable>
    <DataTable.Col source="title" />
  </DataTable>
);

describe("<List>", () => {
  it("renders rows fetched from the data provider through a DataTable", async () => {
    render(
      <Providers>
        <List>{Table}</List>
      </Providers>,
    );
    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("renders a heading from the resource label", async () => {
    render(
      <Providers>
        <List>{Table}</List>
      </Providers>,
    );
    await screen.findByText("Alpha");
    // chelone.page.list = "%{name}" and getResourceLabel("posts", 2) = "Posts".
    expect(screen.getByRole("heading", { name: /posts/i })).toBeTruthy();
  });

  it("honors a title prop over the default heading", async () => {
    render(
      <Providers>
        <List title="My Posts">{Table}</List>
      </Providers>,
    );
    await screen.findByText("Alpha");
    expect(screen.getByRole("heading", { name: "My Posts" })).toBeTruthy();
  });

  it("omits the heading when title is false", async () => {
    render(
      <Providers>
        <List title={false}>{Table}</List>
      </Providers>,
    );
    await screen.findByText("Alpha");
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders custom actions in the header", async () => {
    render(
      <Providers>
        <List actions={<button type="button">Custom Action</button>}>
          {Table}
        </List>
      </Providers>,
    );
    await screen.findByText("Alpha");
    expect(screen.getByRole("button", { name: "Custom Action" })).toBeTruthy();
  });

  it("shows the DataTable empty state when the provider returns nothing", async () => {
    render(
      <Providers posts={[]}>
        <List>{Table}</List>
      </Providers>,
    );
    await screen.findByText(/no results/i);
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("publishes a ListContext its children can read", async () => {
    const seen: { total?: number } = {};
    function Probe() {
      const { total } = useListContext();
      seen.total = total;
      return null;
    }
    render(
      <Providers>
        <List>
          <Probe />
          {Table}
        </List>
      </Providers>,
    );
    await screen.findByText("Alpha");
    await waitFor(() => expect(seen.total).toBe(2));
  });
});
