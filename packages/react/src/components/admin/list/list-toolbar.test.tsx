/**
 * `<ListActions>` and `<ListToolbar>`: the bar of filter form, filter, create
 * and export controls above a list. Mounted as the `actions` of a real
 * `<List>` under a `<CheloneProvider>`, a resource registry and a router;
 * assertions are on DOM, roles and data-provider calls.
 */
import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TextInput } from "../inputs/text-input";
import { List } from "../views/list";
import { ListActions } from "./list-actions";

const filters = [<TextInput key="title" source="title" />];

afterEach(cleanup);

function mount(
  ui: ReactElement,
  { hasCreate = true }: { hasCreate?: boolean } = {},
) {
  const registry = createResourceRegistry();
  registry.register({ name: "posts", hasList: true, hasCreate });
  const dataProvider = fakeDataProvider({
    posts: [
      { id: 1, title: "hello" },
      { id: 2, title: "world" },
    ],
  });
  render(
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
      notifications={createNotificationStore()}
      i18n={createI18n({
        locale: "en",
        messages: {
          en: defineMessages({
            "ra.action.create": "Create",
            "ra.action.export": "Export",
            "ra.action.add_filter": "Add filter",
          }),
        },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <ResourceContextProvider value="posts">
              <List actions={ui}>{null}</List>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>,
  );
  return { dataProvider };
}

describe("<ListActions>", () => {
  it("renders the create and export buttons by default", async () => {
    mount(<ListActions />);
    expect(await screen.findByRole("link", { name: "Create" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add filter" })).toBeNull();
  });

  it("renders the filter button only when filters exist", async () => {
    mount(<ListActions />);
    await screen.findByRole("button", { name: "Export" });
    expect(screen.queryByRole("button", { name: "Add filter" })).toBeNull();
    cleanup();

    mount(<ListActions filters={filters} />);
    expect(
      await screen.findByRole("button", { name: "Add filter" }),
    ).toBeTruthy();
  });

  it("hides the create button when the resource has no create view", async () => {
    mount(<ListActions />, { hasCreate: false });
    await screen.findByRole("button", { name: "Export" });
    expect(screen.queryByRole("link", { name: "Create" })).toBeNull();
  });

  it("exporter false hides the export button and a function exporter runs on export", async () => {
    mount(<ListActions exporter={false} />);
    await screen.findByRole("link", { name: "Create" });
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
    cleanup();

    const exporter = vi.fn();
    mount(<ListActions exporter={exporter} />);
    fireEvent.click(await screen.findByRole("button", { name: "Export" }));
    await waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
    expect(exporter.mock.calls[0]?.[0]).toHaveLength(2);
    expect(exporter.mock.calls[0]?.[2]).toBe("posts");
  });

  it("children replace the default buttons", async () => {
    mount(
      <ListActions>
        <button type="button">Mine</button>
      </ListActions>,
    );
    expect(await screen.findByRole("button", { name: "Mine" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Create" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });
});
