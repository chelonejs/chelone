/**
 * P7e-T1 — `<DataTable>` ported onto chelone `useListContext` (NOT ra-core's
 * `DataTableBase`, which chelone has no equivalent of). Renders `DataTable.Col`
 * children over the current-page rows, each row wrapped in a `RecordContext`,
 * with per-column click-to-sort, page/row selection checkboxes, an empty state,
 * and a loading skeleton.
 *
 * Harness: a client-side `useList` feeds a `ListContextProvider` + a
 * `ResourceContextProvider` — the exact substrate a `<List>` view (T2) will
 * mount. No dataProvider needed for the render/sort/select behavior.
 */
import {
  type CheloneStore,
  createI18n,
  createResourceRegistry,
  createStore,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useDataTableColumns } from "../../../data-table-columns-hooks";
import { ListContextProvider } from "../../../form";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useList } from "../../../use-list";
import { TextField } from "../fields/text-field";
import { DataTable, type DataTableProps } from "./data-table";

afterEach(cleanup);

/** Full provider stack: i18n + registry + router + a memory router. */
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
  const dataProvider = fakeDataProvider({ posts: [] });
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

const ROWS = [
  { id: 1, title: "Beta", views: 10 },
  { id: 2, title: "Alpha", views: 30 },
  { id: 3, title: "Gamma", views: 20 },
];

interface TableHarnessProps
  extends Pick<DataTableProps, "storeKey" | "defaultHiddenColumns" | "expand"> {
  children: ReactNode;
  data?: Array<{ id: number } & Record<string, unknown>>;
  perPage?: number;
  bulkActionButtons?: ReactNode;
  store?: CheloneStore;
}

/** Feeds a DataTable from a live client-list controller (no providers). */
function TableInner({
  children,
  data = ROWS,
  perPage = 10,
  bulkActionButtons,
  ...tableProps
}: TableHarnessProps) {
  const list = useList({ data, perPage });
  return (
    <ResourceContextProvider value="posts">
      <ListContextProvider value={list}>
        <DataTable bulkActionButtons={bulkActionButtons} {...tableProps}>
          {children}
        </DataTable>
      </ListContextProvider>
    </ResourceContextProvider>
  );
}

/** Renders a DataTable inside the full provider stack. */
function TableHarness({ store, ...props }: TableHarnessProps) {
  return (
    <Providers store={store}>
      <TableInner {...props} />
    </Providers>
  );
}

describe("<DataTable> — rendering", () => {
  it("renders one row per record with a cell per column", () => {
    render(
      <TableHarness>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    // Header labels (title/views) from source.
    expect(screen.getAllByRole("columnheader").length).toBe(2);
    // One body row per record.
    const rows = screen.getAllByRole("row");
    // 1 header row + 3 body rows.
    expect(rows.length).toBe(4);
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Gamma")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });

  it("resolves a column value from source when no children/render/field", () => {
    render(
      <TableHarness>
        <DataTable.Col source="title" />
      </TableHarness>,
    );
    expect(screen.getByText("Gamma")).toBeTruthy();
  });

  it("renders the text of a boolean source-only cell", () => {
    render(
      <TableHarness data={[{ id: 1, published: true }]}>
        <DataTable.Col source="published" />
      </TableHarness>,
    );
    expect(screen.getByText("true")).toBeTruthy();
  });

  it("renders children (a Field) against the row record via RecordContext", () => {
    render(
      <TableHarness>
        <DataTable.Col label="Title">
          <TextField source="title" />
        </DataTable.Col>
      </TableHarness>,
    );
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
  });

  it("supports a render function receiving the row record", () => {
    render(
      <TableHarness>
        <DataTable.Col
          label="Upper"
          render={(record) => <span>{String(record.title).toUpperCase()}</span>}
        />
      </TableHarness>,
    );
    expect(screen.getByText("BETA")).toBeTruthy();
  });

  it("renders the empty state when there are no rows", () => {
    render(
      <TableHarness data={[]}>
        <DataTable.Col source="title" />
      </TableHarness>,
    );
    expect(screen.getByText(/no results/i)).toBeTruthy();
  });
});

describe("<DataTable> — sort", () => {
  it("toggles setSort on a sortable header click", () => {
    render(
      <TableHarness>
        <DataTable.Col source="title" />
      </TableHarness>,
    );
    const header = screen.getByRole("columnheader", { name: /title/i });
    const button = within(header).getByRole("button");
    // Client list defaults to sort {id, ASC}; clicking title sorts by title ASC.
    fireEvent.click(button);
    // After the first click the rows are sorted by title ASC (Alpha, Beta, Gamma).
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells[0]).toBe("Alpha");
    // A second click flips to DESC (Gamma, Beta, Alpha).
    fireEvent.click(button);
    const cells2 = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells2[0]).toBe("Gamma");
  });

  it("does not render a sort button for a disableSort column", () => {
    render(
      <TableHarness>
        <DataTable.Col source="title" disableSort />
      </TableHarness>,
    );
    const header = screen.getByRole("columnheader", { name: /title/i });
    expect(within(header).queryByRole("button")).toBeNull();
  });
});

describe("<DataTable> — selection / bulk", () => {
  it("renders selection checkboxes and toggles a row via toggleItem", () => {
    render(
      <TableHarness bulkActionButtons={<span>bulk</span>}>
        <DataTable.Col source="title" />
      </TableHarness>,
    );
    // A header select-all + one checkbox per body row.
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(1 + ROWS.length);
    // Select the first row.
    const firstRow = defined(screen.getAllByRole("row")[1]);
    const rowCheckbox = within(firstRow).getByRole("checkbox");
    fireEvent.click(rowCheckbox);
    // The bulk toolbar reflects one selected row.
    expect(screen.getByText(/1 .*selected|selected/i)).toBeTruthy();
  });

  it("selects every row on the page via the header select-all checkbox", () => {
    render(
      <TableHarness bulkActionButtons={<span>bulk</span>}>
        <DataTable.Col source="title" />
      </TableHarness>,
    );
    const headerRow = defined(screen.getAllByRole("row")[0]);
    const selectAll = within(headerRow).getByRole("checkbox");
    fireEvent.click(selectAll);
    // All three rows selected → the bulk bar shows the count.
    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it("omits selection checkboxes when bulk actions are disabled (default)", () => {
    render(
      <TableHarness>
        <DataTable.Col source="title" />
      </TableHarness>,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("<DataTable> — NumberCol", () => {
  it("right-aligns and formats a numeric column", () => {
    render(
      <TableHarness>
        <DataTable.NumberCol source="views" />
      </TableHarness>,
    );
    // Values render (NumberField formats them).
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });
});

const headers = () =>
  screen.getAllByRole("columnheader").map((h) => h.textContent);

describe("<DataTable> columns", () => {
  it("hides the columns whose ids are in the store", () => {
    const store = createStore();
    store.setItem("posts.datatable", ["views"]);
    render(
      <TableHarness store={store}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Title"]);
    expect(screen.queryByText("30")).toBeNull();
    expect(screen.getByText("Alpha")).toBeTruthy();
  });

  it("shows defaultHiddenColumns until a choice is stored", () => {
    const store = createStore();
    render(
      <TableHarness store={store} defaultHiddenColumns={["views"]}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Title"]);
    cleanup();
    store.setItem("posts.datatable", []);
    render(
      <TableHarness store={store} defaultHiddenColumns={["views"]}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Title", "Views"]);
  });

  it("hides a column with defaultHidden until a choice is stored", () => {
    const store = createStore();
    render(
      <TableHarness store={store}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" defaultHidden />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Title"]);
  });

  it("hides a defaultHidden column on the first render, before anything is published", () => {
    const store = createStore();
    const html = renderToString(
      <TableHarness store={store}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" defaultHidden />
      </TableHarness>,
    );
    expect(html).toContain("Title");
    expect(html).not.toContain("Views");
    expect(store.getItem("posts.datatable_columns")).toBeUndefined();
  });

  it("renders the columns in the stored order", () => {
    const store = createStore();
    store.setItem("posts.datatable_columnOrder", ["views", "title"]);
    render(
      <TableHarness store={store}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Views", "Title"]);
    const firstRow = defined(screen.getAllByRole("row")[1]);
    expect(
      within(firstRow)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["10", "Beta"]);
  });

  it("keeps a column with no id in place and always visible", () => {
    const store = createStore();
    store.setItem("posts.datatable", ["title"]);
    store.setItem("posts.datatable_columnOrder", ["views", "title"]);
    render(
      <TableHarness store={store}>
        <DataTable.Col source="title" />
        <DataTable.Col label={<i>Flag</i>} render={() => "flag"} />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    // Flag keeps its slot in the middle, Views takes the first, Title is hidden.
    expect(headers()).toEqual(["Views", "Flag"]);
    store.setItem("posts.datatable", []);
    cleanup();
    render(
      <TableHarness store={store}>
        <DataTable.Col source="title" />
        <DataTable.Col label={<i>Flag</i>} render={() => "flag"} />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Views", "Flag", "Title"]);
  });

  it("publishes its columns once and again when a column is added", () => {
    const store = createStore();
    const setItem = vi.spyOn(store, "setItem");
    const publishes = () =>
      setItem.mock.calls.filter(([key]) => key === "posts.datatable_columns");
    const { rerender } = render(
      <TableHarness store={store} defaultHiddenColumns={["views"]}>
        <DataTable.Col source="title" label="Headline" />
        <DataTable.Col source="views" />
        <DataTable.Col label={<i>Flag</i>} render={() => "flag"} />
      </TableHarness>,
    );
    expect(publishes()).toHaveLength(1);
    expect(store.getItem("posts.datatable_columns")).toEqual([
      { id: "title", source: "title", label: "Headline" },
      { id: "views", source: "views", defaultHidden: true },
    ]);
    rerender(
      <TableHarness store={store} defaultHiddenColumns={["views"]}>
        <DataTable.Col source="title" label="Headline" />
        <DataTable.Col source="views" />
        <DataTable.Col label={<i>Flag</i>} render={() => "flag"} />
      </TableHarness>,
    );
    expect(publishes()).toHaveLength(1);
    rerender(
      <TableHarness store={store} defaultHiddenColumns={["views"]}>
        <DataTable.Col source="title" label="Headline" />
        <DataTable.Col source="views" />
        <DataTable.Col source="id" />
      </TableHarness>,
    );
    expect(publishes()).toHaveLength(2);
    expect(store.getItem("posts.datatable_columns")).toEqual([
      expect.objectContaining({ id: "title" }),
      expect.objectContaining({ id: "views" }),
      expect.objectContaining({ id: "id" }),
    ]);
  });

  it("renders every column and writes nothing when no store is provided", () => {
    render(
      <TableHarness defaultHiddenColumns={["views"]}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Title", "Views"]);
  });

  it("reads and writes the keys of the storeKey prop", () => {
    const store = createStore();
    store.setItem("posts.datatable", ["title"]);
    store.setItem("custom", ["views"]);
    store.setItem("custom_columnOrder", ["views", "title"]);
    render(
      <TableHarness store={store} storeKey="custom">
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    expect(headers()).toEqual(["Title"]);
    expect(store.getItem("custom_columns")).toEqual([
      { id: "title", source: "title" },
      { id: "views", source: "views" },
    ]);
    expect(store.getItem("posts.datatable_columns")).toBeUndefined();
  });

  it("sizes the expand panel to the visible columns", () => {
    const store = createStore();
    store.setItem("posts.datatable", ["views"]);
    render(
      <TableHarness store={store} expand={<div>details</div>}>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </TableHarness>,
    );
    const panelCell = elementOf(
      document.querySelector('[data-slot="data-table-expand-panel"] td'),
      HTMLTableCellElement,
    );
    expect(panelCell.colSpan).toBe(2);
  });
});

describe("useDataTableColumns", () => {
  function Probe({ defaults }: { defaults?: string[] }) {
    const { columns, hidden, order, toggle, move, reset, publish } =
      useDataTableColumns({
        storeKey: "t",
        defaultHiddenColumns: defaults,
      });
    return (
      <div>
        <output data-testid="state">
          {JSON.stringify({ columns, hidden, order })}
        </output>
        <button
          type="button"
          onClick={() =>
            publish([
              { id: "a", defaultHidden: true },
              { id: "b" },
              { id: "c" },
            ])
          }
        >
          publish
        </button>
        <button type="button" onClick={() => toggle("b")}>
          toggle b
        </button>
        <button type="button" onClick={() => toggle("a")}>
          toggle a
        </button>
        <button type="button" onClick={() => move("c", -1)}>
          move c up
        </button>
        <button type="button" onClick={reset}>
          reset
        </button>
      </div>
    );
  }
  const state = () =>
    JSON.parse(defined(screen.getByTestId("state").textContent));
  const click = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));

  it("toggle, move and reset write the store keys and notify subscribers", () => {
    const store = createStore();
    const onHidden = vi.fn();
    const onOrder = vi.fn();
    store.subscribe("t", onHidden);
    store.subscribe("t_columnOrder", onOrder);
    render(
      <Providers store={store}>
        <Probe />
      </Providers>,
    );
    click("publish");
    expect(state().columns.map((c: { id: string }) => c.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    // The only hidden column is the one that is hidden by default.
    expect(state().hidden).toEqual(["a"]);

    click("toggle b");
    expect(store.getItem("t")).toEqual(["a", "b"]);
    expect(state().hidden).toEqual(["a", "b"]);
    expect(onHidden).toHaveBeenCalledTimes(1);

    click("move c up");
    expect(store.getItem("t_columnOrder")).toEqual(["a", "c", "b"]);
    expect(state().order).toEqual(["a", "c", "b"]);
    expect(onOrder).toHaveBeenCalledTimes(1);

    click("reset");
    expect(store.getItem("t")).toBeUndefined();
    expect(store.getItem("t_columnOrder")).toBeUndefined();
    expect(state().hidden).toEqual(["a"]);
    expect(state().order).toEqual([]);
    expect(onHidden).toHaveBeenCalledTimes(2);
    expect(onOrder).toHaveBeenCalledTimes(2);
  });

  it("a toggle on a table with defaultHiddenColumns keeps the other default hidden ids", () => {
    const store = createStore();
    render(
      <Providers store={store}>
        <Probe defaults={["a", "b"]} />
      </Providers>,
    );
    expect(state().hidden).toEqual(["a", "b"]);
    click("toggle a");
    expect(store.getItem("t")).toEqual(["b"]);
  });

  it("shows every column and ignores the setters without a store", () => {
    render(
      <Providers>
        <Probe defaults={["a"]} />
      </Providers>,
    );
    click("publish");
    click("toggle b");
    click("move c up");
    click("reset");
    expect(state()).toEqual({ columns: [], hidden: [], order: [] });
  });
});
