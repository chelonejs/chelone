import {
  addEventsForMutations,
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
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
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useCheloneFormContext } from "../../../form-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useSaveContext } from "../../../save-context";
import { TextInput } from "../inputs/text-input";
import { EditLive } from "./edit-live";

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
  // Another client changes the record: the provider publishes the event.
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const titleInput = () =>
  elementOf(screen.getByLabelText(/title/i), HTMLInputElement);

function FormButtons() {
  const { form } = useCheloneFormContext();
  const { save } = useSaveContext();
  return (
    <>
      <button type="button" onClick={() => form.ambient.reset()}>
        reset
      </button>
      <button type="button" onClick={() => save?.({})}>
        save
      </button>
    </>
  );
}

const Fields = (
  <>
    <TextInput source="title" />
    <FormButtons />
  </>
);

describe("<EditLive>", () => {
  it("renders the form like <Edit>", async () => {
    const { Providers } = setup();
    render(
      <Providers>
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(titleInput().value).toBe("Original"));
    expect(screen.getByRole("heading", { name: "Original" })).toBeTruthy();
  });

  it("refetches and shows the new value when the record changes and the form is clean", async () => {
    const { Providers, changeTitle, getOne } = setup();
    render(
      <Providers>
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(titleInput().value).toBe("Original"));
    expect(getOne).toHaveBeenCalledTimes(1);

    await changeTitle("Changed");

    await waitFor(() => expect(titleInput().value).toBe("Changed"));
    expect(getOne).toHaveBeenCalledTimes(2);
  });

  it("keeps a typed value when the record changes while the form is dirty", async () => {
    const { Providers, changeTitle, getOne } = setup();
    render(
      <Providers>
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(titleInput().value).toBe("Original"));
    fireEvent.change(titleInput(), { target: { value: "Typed" } });

    await changeTitle("Changed");
    await settle();

    expect(titleInput().value).toBe("Typed");
    expect(getOne).toHaveBeenCalledTimes(1);
  });

  it("applies the held change once the form is saved or reset", async () => {
    const { Providers, changeTitle, getOne, dataProvider } = setup();
    const update = vi.spyOn(dataProvider, "update");
    render(
      <Providers>
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(titleInput().value).toBe("Original"));

    // Reset: the held change lands once the form is clean again.
    fireEvent.change(titleInput(), { target: { value: "Typed" } });
    await changeTitle("Remote");
    await settle();
    expect(getOne).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    await waitFor(() => expect(titleInput().value).toBe("Remote"));
    expect(getOne).toHaveBeenCalledTimes(2);

    // Save: the saved value is what the refetch returns.
    update.mockClear();
    fireEvent.change(titleInput(), { target: { value: "Saved" } });
    await changeTitle("Remote again");
    await settle();
    expect(getOne).toHaveBeenCalledTimes(2);
    update.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getOne.mock.calls.length).toBeGreaterThan(2));
    await waitFor(() => expect(titleInput().value).toBe("Saved"));
  });

  it("holds a change while the form is touched, even if the typed value matches the record", async () => {
    const { Providers, changeTitle, getOne } = setup();
    render(
      <Providers>
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(titleInput().value).toBe("Original"));
    fireEvent.change(titleInput(), { target: { value: "Typed" } });
    fireEvent.change(titleInput(), { target: { value: "Original" } });

    await changeTitle("Changed");
    await settle();
    expect(getOne).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    await waitFor(() => expect(titleInput().value).toBe("Changed"));
  });

  it("ignores events of other records", async () => {
    const { Providers, changeTitle, getOne } = setup();
    render(
      <Providers>
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(titleInput().value).toBe("Original"));

    await changeTitle("Changed", 2);
    await settle();

    expect(getOne).toHaveBeenCalledTimes(1);
    expect(titleInput().value).toBe("Original");
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
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(getOne).toHaveBeenCalledTimes(1));
    await changeTitle("Changed");
    release();

    await waitFor(() => expect(titleInput().value).toBe("Changed"));
  });

  it("stops listening on unmount", async () => {
    const { Providers, changeTitle, transport, getOne } = setup();
    const { unmount } = render(
      <Providers>
        <EditLive>{Fields}</EditLive>
      </Providers>,
    );
    await waitFor(() => expect(titleInput().value).toBe("Original"));

    unmount();
    await changeTitle("Changed");
    act(() => transport.simulateReconnect());
    await settle();

    expect(getOne).toHaveBeenCalledTimes(1);
  });
});
