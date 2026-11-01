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
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TextField } from "../fields/text-field";
import { ShowLive } from "./show-live";

afterEach(cleanup);

function setup() {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(
    addEventsForMutations(
      fakeDataProvider({
        posts: [
          { id: 1, title: "Original" },
          { id: 2, title: "Other" },
        ],
      }),
      transport,
    ),
    transport,
  );
  const realGetOne = dataProvider.getOne.bind(dataProvider);
  const getOne = vi.spyOn(dataProvider, "getOne");
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
    messages: { en: defineMessages({}) },
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/1/show"]}>
            <ResourceContextProvider value="posts">
              <Routes>
                <Route path=":id/show" element={children} />
              </Routes>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
  const changeTitle = (title: string, id = 1) =>
    act(async () => {
      await dataProvider.update("posts", {
        id,
        data: { title },
        previousData: { id },
      });
    });
  return {
    transport,
    dataProvider,
    getOne,
    realGetOne,
    Providers,
    changeTitle,
  };
}

const Fields = <TextField source="title" />;

describe("<ShowLive>", () => {
  it("renders the record fields like <Show>", async () => {
    const { Providers } = setup();
    render(
      <Providers>
        <ShowLive>{Fields}</ShowLive>
      </Providers>,
    );
    expect(await screen.findAllByText("Original")).not.toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Original" })).toBeTruthy();
  });

  it("shows the new value after an event on the record topic", async () => {
    const { Providers, changeTitle, getOne } = setup();
    render(
      <Providers>
        <ShowLive title={false}>{Fields}</ShowLive>
      </Providers>,
    );
    await screen.findByText("Original");
    expect(getOne).toHaveBeenCalledTimes(1);

    await changeTitle("Changed");

    expect(await screen.findByText("Changed")).toBeTruthy();
    expect(getOne).toHaveBeenCalledTimes(2);
  });

  it("hears an event that lands before the record has loaded", async () => {
    const { Providers, changeTitle, getOne, realGetOne } = setup();
    // The first read sees the record as it was, but returns only once released.
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    getOne.mockImplementationOnce(async (resource, params) => {
      const result = await realGetOne(resource, params);
      await gate;
      return result;
    });
    render(
      <Providers>
        <ShowLive title={false}>{Fields}</ShowLive>
      </Providers>,
    );
    await waitFor(() => expect(getOne).toHaveBeenCalledTimes(1));
    await changeTitle("Changed");
    release();

    expect(await screen.findByText("Changed")).toBeTruthy();
  });

  it("refetches after a reconnect", async () => {
    const { Providers, transport, getOne } = setup();
    render(
      <Providers>
        <ShowLive title={false}>{Fields}</ShowLive>
      </Providers>,
    );
    await screen.findByText("Original");

    act(() => transport.simulateReconnect());

    await waitFor(() => expect(getOne).toHaveBeenCalledTimes(2));
  });

  it("takes the id from the id prop over the route param", async () => {
    const { Providers, changeTitle, getOne } = setup();
    render(
      <Providers>
        <ShowLive id={2} title={false}>
          {Fields}
        </ShowLive>
      </Providers>,
    );
    await screen.findByText("Other");

    await changeTitle("Route record", 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getOne).toHaveBeenCalledTimes(1);

    await changeTitle("Prop record", 2);
    expect(await screen.findByText("Prop record")).toBeTruthy();
    expect(getOne).toHaveBeenCalledTimes(2);
  });
});
