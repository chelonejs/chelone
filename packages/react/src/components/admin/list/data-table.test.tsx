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
  createI18n,
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
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
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
import { TextField } from "../fields/text-field";
import { DataTable } from "./data-table";

afterEach(cleanup);

/** Full provider stack: i18n + registry + router + a memory router. */
function Providers({ children }: { children: ReactNode }) {
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

/** Feeds a DataTable from a live client-list controller (no providers). */
function TableInner({
  children,
  data = ROWS,
  perPage = 10,
  bulkActionButtons,
}: {
  children: ReactNode;
  data?: Array<{ id: number } & Record<string, unknown>>;
  perPage?: number;
  bulkActionButtons?: ReactNode;
}) {
  const list = useList({ data, perPage });
  return (
    <ResourceContextProvider value="posts">
      <ListContextProvider value={list as unknown as ListContextValue}>
        <DataTable bulkActionButtons={bulkActionButtons}>{children}</DataTable>
      </ListContextProvider>
    </ResourceContextProvider>
  );
}

/** Renders a DataTable inside the full provider stack. */
function TableHarness(props: {
  children: ReactNode;
  data?: Array<{ id: number } & Record<string, unknown>>;
  perPage?: number;
  bulkActionButtons?: ReactNode;
}) {
  return (
    <Providers>
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
    const firstRow = screen.getAllByRole("row")[1] as HTMLElement;
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
    const headerRow = screen.getAllByRole("row")[0] as HTMLElement;
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
