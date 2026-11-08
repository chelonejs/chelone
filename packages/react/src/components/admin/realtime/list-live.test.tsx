import {
  addEventsForMutations,
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { DataTable } from "../list/data-table";
import { ListLive } from "./list-live";

afterEach(cleanup);

const POSTS = [
  { id: 1, title: "Alpha" },
  { id: 2, title: "Beta" },
];

function setup() {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(
    addEventsForMutations(fakeDataProvider({ posts: POSTS }), transport),
    transport,
  );
  const getList = vi.spyOn(dataProvider, "getList");
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
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.list": "{name}",
        "chelone.navigation.no_results": "No results found",
      }),
    },
  });
  const Providers = ({
    children,
    resource = "posts",
  }: {
    children: ReactNode;
    resource?: string | null;
  }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            {resource === null ? (
              children
            ) : (
              <ResourceContextProvider value={resource}>
                {children}
              </ResourceContextProvider>
            )}
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
  const emit = (topic: string) =>
    act(() => dataProvider.publish(topic, { type: "updated", payload: {} }));
  return { transport, dataProvider, getList, Providers, emit };
}

const Table = (
  <DataTable>
    <DataTable.Col source="title" />
  </DataTable>
);

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("<ListLive>", () => {
  it("renders the rows like <List>", async () => {
    const { Providers } = setup();
    render(
      <Providers>
        <ListLive>{Table}</ListLive>
      </Providers>,
    );
    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /posts/i })).toBeTruthy();
  });

  it("shows a created record after an event on the resource topic", async () => {
    const { Providers, dataProvider, getList } = setup();
    render(
      <Providers>
        <ListLive>{Table}</ListLive>
      </Providers>,
    );
    await screen.findByText("Alpha");
    expect(getList).toHaveBeenCalledTimes(1);

    await act(async () => {
      await dataProvider.create("posts", { data: { id: 3, title: "Gamma" } });
    });

    expect(await screen.findByText("Gamma")).toBeTruthy();
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it("refetches after a reconnect", async () => {
    const { Providers, transport, getList } = setup();
    render(
      <Providers>
        <ListLive>{Table}</ListLive>
      </Providers>,
    );
    await screen.findByText("Alpha");

    act(() => transport.simulateReconnect());

    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
  });

  it("ignores events of another resource", async () => {
    const { Providers, emit, getList } = setup();
    render(
      <Providers>
        <ListLive>{Table}</ListLive>
      </Providers>,
    );
    await screen.findByText("Alpha");

    await emit("resource/comments");
    await settle();

    expect(getList).toHaveBeenCalledTimes(1);
  });

  it("stops listening on unmount", async () => {
    const { Providers, emit, transport, getList } = setup();
    const { unmount } = render(
      <Providers>
        <ListLive>{Table}</ListLive>
      </Providers>,
    );
    await screen.findByText("Alpha");

    unmount();
    await emit("resource/posts");
    act(() => transport.simulateReconnect());
    await settle();

    expect(getList).toHaveBeenCalledTimes(1);
  });

  it("takes the resource from the prop when there is no resource context", async () => {
    const { Providers, emit, getList } = setup();
    render(
      <Providers resource={null}>
        <ListLive resource="posts">{Table}</ListLive>
      </Providers>,
    );
    await screen.findByText("Alpha");

    await emit("resource/posts");

    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
  });

  it("a delete through addEventsForMutations removes the row", async () => {
    const { Providers, dataProvider } = setup();
    render(
      <Providers>
        <ListLive>{Table}</ListLive>
      </Providers>,
    );
    await screen.findByText("Beta");

    await act(async () => {
      await dataProvider.delete("posts", { id: 2 });
    });

    await waitFor(() => expect(screen.queryByText("Beta")).toBeNull());
    expect(screen.getByText("Alpha")).toBeTruthy();
  });
});
