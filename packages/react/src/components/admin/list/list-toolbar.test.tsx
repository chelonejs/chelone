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
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useFilterContext } from "../../../list/filter-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TextInput } from "../inputs/text-input";
import { List } from "../views/list";
import { ListActions } from "./list-actions";
import { ListToolbar } from "./list-toolbar";

const filters = [<TextInput key="title" source="title" />];

afterEach(cleanup);

function mount(
  ui: ReactElement,
  { hasCreate = true }: { hasCreate?: boolean } = {},
) {
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate,
    hasEdit: false,
    hasShow: false,
  });
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
            "chelone.action.create": "Create",
            "chelone.action.export": "Export",
            "chelone.action.add_filter": "Add filter",
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

/** Prints what a custom `actions` element is handed. */
function Probe(props: {
  filters?: ReactNode[];
  exporter?: unknown;
  hasCreate?: boolean;
}) {
  return (
    <output>
      {`filters:${props.filters?.length ?? "none"} exporter:${typeof props.exporter} hasCreate:${String(props.hasCreate)}`}
    </output>
  );
}

function FilterCount() {
  return <output>{`context:${useFilterContext()?.length ?? "none"}`}</output>;
}

const alwaysOn = [<TextInput key="title" source="title" alwaysOn />];

describe("<ListToolbar>", () => {
  it("renders the filter form beside the default actions", async () => {
    mount(<ListToolbar filters={alwaysOn} />);
    expect(await screen.findByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
  });

  it("accepts filters as an element and as an array", async () => {
    mount(
      <ListToolbar
        filters={
          <>
            <TextInput source="title" alwaysOn />
            <TextInput source="body" alwaysOn />
          </>
        }
      />,
    );
    expect(await screen.findAllByRole("textbox")).toHaveLength(2);
    cleanup();

    mount(<ListToolbar filters={alwaysOn} />);
    expect(await screen.findAllByRole("textbox")).toHaveLength(1);
  });

  it("actions false renders no actions", async () => {
    mount(<ListToolbar filters={alwaysOn} actions={false} />);
    await screen.findByRole("textbox");
    expect(screen.queryByRole("link", { name: "Create" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  it("a custom actions element receives filters, exporter and hasCreate", async () => {
    mount(
      <ListToolbar
        filters={alwaysOn}
        exporter={() => {}}
        hasCreate
        actions={<Probe />}
      />,
    );
    expect((await screen.findByRole("status")).textContent).toBe(
      "filters:1 exporter:function hasCreate:true",
    );
  });

  it("keeps hasCreate set on a custom actions element", async () => {
    mount(
      <ListToolbar filters={alwaysOn} actions={<Probe hasCreate={false} />} />,
    );
    expect((await screen.findByRole("status")).textContent).toBe(
      "filters:1 exporter:undefined hasCreate:false",
    );
  });

  it("lets props set on a custom actions element win over the toolbar's", async () => {
    mount(
      <ListToolbar
        filters={alwaysOn}
        exporter={() => {}}
        hasCreate
        actions={<ListActions exporter={false} hasCreate={false} />}
      />,
    );
    await screen.findByRole("textbox");
    expect(screen.queryByRole("link", { name: "Create" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  it("children of the actions element read the filters through FilterContext", async () => {
    mount(
      <ListToolbar
        filters={alwaysOn}
        actions={
          <ListActions>
            <FilterCount />
          </ListActions>
        }
      />,
    );
    expect((await screen.findByRole("status")).textContent).toBe("context:1");
  });
});
