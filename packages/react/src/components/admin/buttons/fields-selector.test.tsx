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
import { ListContextProvider } from "../../../form";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useList } from "../../../use-list";
import { DataTable } from "../list/data-table";
import {
  FieldsSelector,
  type FieldsSelectorListProps,
  type FieldsSelectorProps,
  type FieldsSelectorRowProps,
} from "./fields-selector";

afterEach(cleanup);

const ROWS = [{ id: 1, title: "Beta", views: 10, author: "Ann", tags: "x" }];
const STORE_KEY = "posts.datatable";

function Providers({
  children,
  store,
}: {
  children: ReactNode;
  store: CheloneStore;
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

function Page({
  children,
  selector,
}: {
  children: ReactNode;
  selector?: Partial<FieldsSelectorProps>;
}) {
  const list = useList({ data: ROWS, perPage: 10 });
  return (
    <ResourceContextProvider value="posts">
      <ListContextProvider value={list}>
        <FieldsSelector storeKey={STORE_KEY} resource="posts" {...selector} />
        <DataTable>{children}</DataTable>
      </ListContextProvider>
    </ResourceContextProvider>
  );
}

function renderPage(props: Parameters<typeof Page>[0]) {
  const store = createStore();
  render(
    <Providers store={store}>
      <Page {...props} />
    </Providers>,
  );
  return { store };
}

const col = (source: string) => <DataTable.Col key={source} source={source} />;
const labelled = (label: string) => (
  <DataTable.Col key={label} label={label} render={() => "x"} />
);
const headers = () =>
  screen.getAllByRole("columnheader").map((h) => h.textContent);
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const switches = () =>
  screen.getAllByRole("switch").map((s) => ({
    name: s.getAttribute("aria-label"),
    on: s.getAttribute("aria-checked") === "true",
  }));

describe("<FieldsSelector>", () => {
  it("shows, hides and moves the columns a DataTable published under its store key", () => {
    renderPage({ children: [col("title"), col("views"), col("author")] });
    expect(switches()).toEqual([
      { name: "Title", on: true },
      { name: "Views", on: true },
      { name: "Author", on: true },
    ]);
    fireEvent.click(screen.getByRole("switch", { name: "Views" }));
    expect(headers()).toEqual(["Title", "Author"]);
    // Views is hidden but still listed, so Title moves past it.
    click("Move down Title");
    expect(switches().map((s) => s.name)).toEqual(["Views", "Title", "Author"]);
    click("Move down Title");
    expect(headers()).toEqual(["Author", "Title"]);
    click("Reset");
    expect(headers()).toEqual(["Title", "Views", "Author"]);
  });

  it("listAs and rowAs wrap the list and each row, and onMove moves a column to an index", () => {
    const lists: Array<Pick<FieldsSelectorListProps, "ids" | "disabled">> = [];
    const rows: Array<Omit<FieldsSelectorRowProps, "children">> = [];
    function List({
      ids,
      disabled,
      onMove,
      children,
    }: FieldsSelectorListProps) {
      lists.push({ ids, disabled });
      return (
        <div data-testid="list">
          <button type="button" onClick={() => onMove("title", 2)}>
            Drop title last
          </button>
          {children}
        </div>
      );
    }
    function Row({ id, index, disabled, children }: FieldsSelectorRowProps) {
      rows.push({ id, index, disabled });
      return <div data-testid={`row-${id}`}>{children}</div>;
    }
    renderPage({
      children: [col("title"), col("views"), col("author")],
      selector: { listAs: List, rowAs: Row },
    });

    const list = screen.getByTestId("list");
    expect(list.tagName).toBe("DIV");
    expect(within(list).getAllByTestId(/^row-/)).toHaveLength(3);
    expect(lists.at(-1)?.ids).toEqual(["title", "views", "author"]);
    expect(rows.filter((row) => row.id === "views").at(-1)).toEqual({
      id: "views",
      index: 1,
      disabled: false,
    });

    click("Drop title last");
    expect(headers()).toEqual(["Views", "Author", "Title"]);
    expect(lists.at(-1)?.ids).toEqual(["views", "author", "title"]);
  });

  it("the list is disabled while searching", () => {
    const flags: boolean[] = [];
    const rowFlags: boolean[] = [];
    function List({ disabled, children }: FieldsSelectorListProps) {
      flags.push(disabled);
      return <ul>{children}</ul>;
    }
    function Row({ disabled, children }: FieldsSelectorRowProps) {
      rowFlags.push(disabled);
      return <li>{children}</li>;
    }
    renderPage({
      children: [
        col("title"),
        col("views"),
        col("author"),
        col("tags"),
        labelled("Café"),
        labelled("Résumé"),
      ],
      selector: { listAs: List, rowAs: Row },
    });
    expect(flags.at(-1)).toBe(false);
    fireEvent.change(screen.getByPlaceholderText("Search columns"), {
      target: { value: "cafe" },
    });
    expect(flags.at(-1)).toBe(true);
    expect(rowFlags.at(-1)).toBe(true);
    click("Clear");
    expect(flags.at(-1)).toBe(false);
  });

  it("a column label with markup renders as text", () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    try {
      renderPage({ children: [labelled("<img src=x onerror=alert(1)>")] });
      expect(
        screen.getByRole("switch", { name: "<img src=x onerror=alert(1)>" }),
      ).toBeTruthy();
      expect(document.querySelector("img")).toBeNull();
      expect(alert).not.toHaveBeenCalled();
    } finally {
      alert.mockRestore();
    }
  });
});
