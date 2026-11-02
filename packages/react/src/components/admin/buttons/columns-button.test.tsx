import {
  type CheloneStore,
  createI18n,
  createResourceRegistry,
  createStore,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import type { ListContextValue } from "../../../form";
import { ListContextProvider } from "../../../form";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useList } from "../../../use-list";
import { DataTable } from "../list/data-table";
import { ColumnsButton, type ColumnsButtonProps } from "./columns-button";

afterEach(cleanup);

function Providers({
  children,
  store,
}: {
  children: ReactNode;
  store?: CheloneStore;
}) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
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
      dataProvider={fakeDataProvider({ posts: [] })}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      i18n={i18n}
      store={store}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>{children}</MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

const ROWS = [{ id: 1, title: "Beta", views: 10, author: "Ann", tags: "x" }];

function Page({
  children,
  button,
  defaultHiddenColumns,
  withTable = true,
  noResource = false,
}: {
  children?: ReactNode;
  button?: ColumnsButtonProps;
  defaultHiddenColumns?: string[];
  withTable?: boolean;
  noResource?: boolean;
}) {
  const list = useList({ data: ROWS, perPage: 10 });
  return (
    <ResourceContextProvider value={noResource ? undefined : "posts"}>
      <ListContextProvider value={list as unknown as ListContextValue}>
        <ColumnsButton {...button} />
        {withTable ? (
          <DataTable defaultHiddenColumns={defaultHiddenColumns}>
            {children}
          </DataTable>
        ) : null}
      </ListContextProvider>
    </ResourceContextProvider>
  );
}

function renderPage(
  props: Parameters<typeof Page>[0],
  store: CheloneStore | null = createStore(),
) {
  const view = render(
    <Providers store={store ?? undefined}>
      <Page {...props} />
    </Providers>,
  );
  return { store: store as CheloneStore, ...view };
}

const col = (source: string, extra?: { defaultHidden?: boolean }) => (
  <DataTable.Col key={source} source={source} {...extra} />
);
const labelled = (label: string) => (
  <DataTable.Col key={label} label={label} render={() => "x"} />
);

const headers = (scope: HTMLElement | Document = document) =>
  within(scope as HTMLElement)
    .getAllByRole("columnheader")
    .map((h) => h.textContent);
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const open = () => click("Columns");
const toggleSwitch = (name: string) =>
  fireEvent.click(screen.getByRole("switch", { name }));
const switches = () =>
  screen.getAllByRole("switch").map((s) => ({
    name: s.getAttribute("aria-label"),
    on: s.getAttribute("aria-checked") === "true",
  }));
const isDisabled = (name: string) =>
  (screen.getByRole("button", { name }) as HTMLButtonElement).disabled;

describe("<ColumnsButton>", () => {
  it("lists the columns the DataTable published, each with a switch", () => {
    renderPage({ children: [col("title"), col("views")] });
    open();
    expect(switches()).toEqual([
      { name: "Title", on: true },
      { name: "Views", on: true },
    ]);
  });

  it("turning a switch off hides that column in the table and on again shows it", () => {
    renderPage({ children: [col("title"), col("views")] });
    open();
    toggleSwitch("Views");
    expect(headers()).toEqual(["Title"]);
    // A hidden column stays listed so it can be shown again.
    expect(switches()).toEqual([
      { name: "Title", on: true },
      { name: "Views", on: false },
    ]);
    toggleSwitch("Views");
    expect(headers()).toEqual(["Title", "Views"]);
  });

  it("move down and move up reorder the table columns", () => {
    renderPage({ children: [col("title"), col("views"), col("author")] });
    open();
    click("Move down Title");
    expect(headers()).toEqual(["Views", "Title", "Author"]);
    expect(switches().map((s) => s.name)).toEqual(["Views", "Title", "Author"]);
    click("Move up Author");
    expect(headers()).toEqual(["Views", "Author", "Title"]);
  });

  it("disables move up on the first row and move down on the last", () => {
    renderPage({ children: [col("title"), col("views"), col("author")] });
    open();
    expect(isDisabled("Move up Title")).toBe(true);
    expect(isDisabled("Move down Title")).toBe(false);
    expect(isDisabled("Move up Views")).toBe(false);
    expect(isDisabled("Move down Views")).toBe(false);
    expect(isDisabled("Move up Author")).toBe(false);
    expect(isDisabled("Move down Author")).toBe(true);
  });

  it("turning a switch on keeps the other columns the table hides by default", () => {
    const { store } = renderPage({
      children: [
        col("title"),
        col("views", { defaultHidden: true }),
        col("author", { defaultHidden: true }),
      ],
    });
    expect(headers()).toEqual(["Title"]);
    open();
    toggleSwitch("Views");
    expect(headers()).toEqual(["Title", "Views"]);
    expect(store.getItem("posts.datatable")).toEqual(["author"]);
  });

  it("shows the columns the table hides through defaultHiddenColumns as off", () => {
    const { store } = renderPage({
      defaultHiddenColumns: ["views"],
      children: [col("title"), col("views")],
    });
    expect(headers()).toEqual(["Title"]);
    open();
    expect(switches()).toEqual([
      { name: "Title", on: true },
      { name: "Views", on: false },
    ]);
    toggleSwitch("Views");
    expect(headers()).toEqual(["Title", "Views"]);
    expect(store.getItem("posts.datatable")).toEqual([]);
  });

  it("Reset restores the default hidden columns and the declared order", () => {
    const { store } = renderPage({
      children: [
        col("title"),
        col("views", { defaultHidden: true }),
        col("author"),
      ],
    });
    expect(headers()).toEqual(["Title", "Author"]);
    open();
    toggleSwitch("Views");
    click("Move down Title");
    expect(headers()).toEqual(["Views", "Title", "Author"]);
    click("Reset");
    expect(headers()).toEqual(["Title", "Author"]);
    expect(store.getItem("posts.datatable")).toBeUndefined();
    expect(store.getItem("posts.datatable_columnOrder")).toBeUndefined();
  });

  it("the choice survives a remount through the store", () => {
    const store = createStore();
    const first = renderPage(
      { children: [col("title"), col("views"), col("author")] },
      store,
    );
    open();
    toggleSwitch("Views");
    click("Move down Title");
    expect(headers()).toEqual(["Title", "Author"]);
    first.unmount();

    renderPage(
      { children: [col("title"), col("views"), col("author")] },
      store,
    );
    expect(headers()).toEqual(["Title", "Author"]);
    open();
    expect(switches()).toEqual([
      { name: "Views", on: false },
      { name: "Title", on: true },
      { name: "Author", on: true },
    ]);
  });

  it("shows a search box over five columns and filters ignoring accents", () => {
    renderPage({
      children: [
        col("title"),
        col("views"),
        col("author"),
        col("tags"),
        labelled("Café"),
      ],
    });
    open();
    expect(screen.queryByPlaceholderText("Search columns")).toBeNull();
    cleanup();

    renderPage({
      children: [
        col("title"),
        col("views"),
        col("author"),
        col("tags"),
        labelled("Café"),
        labelled("Résumé"),
      ],
    });
    open();
    fireEvent.change(screen.getByPlaceholderText("Search columns"), {
      target: { value: "cafe" },
    });
    expect(switches()).toEqual([{ name: "Café", on: true }]);
    click("Clear");
    expect(switches()).toHaveLength(6);
  });

  it("disables the move buttons while a search is active", () => {
    renderPage({
      children: [
        col("title"),
        col("views"),
        col("author"),
        col("tags"),
        labelled("Café"),
        labelled("Résumé"),
      ],
    });
    open();
    expect(isDisabled("Move down Views")).toBe(false);
    fireEvent.change(screen.getByPlaceholderText("Search columns"), {
      target: { value: "views" },
    });
    expect(isDisabled("Move down Views")).toBe(true);
    expect(isDisabled("Move up Views")).toBe(true);
  });

  it("lists a column that has a source but a non-string label under its humanized source", () => {
    renderPage({
      children: [
        <DataTable.Col
          key="a"
          source="first_name"
          label={<b>Who</b>}
          render={() => "x"}
        />,
      ],
    });
    open();
    expect(switches()).toEqual([{ name: "First name", on: true }]);
  });

  it("is disabled before a table has published columns", () => {
    renderPage({ withTable: false });
    expect(isDisabled("Columns")).toBe(true);
  });

  it("throws without a store, and without a resource or storeKey", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const noStore = () => renderPage({ children: [col("title")] }, null);
    const noResource = () => renderPage({ withTable: false, noResource: true });
    const withStoreKey = () =>
      renderPage({
        withTable: false,
        noResource: true,
        button: { storeKey: "custom" },
      });
    try {
      expect(noStore).toThrow("useCheloneStore");
      cleanup();
      expect(noResource).toThrow("needs a resource, a storeKey");
      cleanup();
      expect(withStoreKey).not.toThrow();
    } finally {
      error.mockRestore();
    }
  });

  it("two tables with different storeKey props keep separate choices", () => {
    function Lists() {
      const list = useList({ data: ROWS, perPage: 10 });
      return (
        <ResourceContextProvider value="posts">
          <ListContextProvider value={list as unknown as ListContextValue}>
            <ColumnsButton storeKey="a" aria-label="Columns A" />
            <ColumnsButton storeKey="b" aria-label="Columns B" />
            <div data-testid="a">
              <DataTable storeKey="a">{[col("title"), col("views")]}</DataTable>
            </div>
            <div data-testid="b">
              <DataTable storeKey="b">{[col("title"), col("views")]}</DataTable>
            </div>
          </ListContextProvider>
        </ResourceContextProvider>
      );
    }
    render(
      <Providers store={createStore()}>
        <Lists />
      </Providers>,
    );
    click("Columns A");
    toggleSwitch("Views");
    click("Columns A");
    expect(headers(screen.getByTestId("a"))).toEqual(["Title"]);
    expect(headers(screen.getByTestId("b"))).toEqual(["Title", "Views"]);
    click("Columns B");
    expect(switches()).toEqual([
      { name: "Title", on: true },
      { name: "Views", on: true },
    ]);
  });
});
