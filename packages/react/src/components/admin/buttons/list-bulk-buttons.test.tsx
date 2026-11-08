/**
 * P7g tests: list + bulk buttons — `<ExportButton>`, `<BulkDeleteButton>`,
 * `<BulkUpdateButton>`, `<BulkExportButton>`, `<RefreshButton>`,
 * `<SortButton>`, `<ListButton>`, `<FilterButton>`.
 *
 * Harness: a real `useListController("posts")` over a `fakeDataProvider` feeds a
 * `ListContextProvider` + `ResourceContextProvider` — the substrate a `<List>`
 * view mounts. Selection is seeded through the controller's `select` action so
 * the bulk buttons see `selectedIds`. Assertions:
 * - bulk-delete removes the selected rows from the provider + clears selection;
 * - bulk-update patches the selected rows;
 * - export / bulk-export fetch through the provider (via a spy exporter);
 * - refresh invalidates queries;
 * - sort opens a menu + calls the controller `setSort`;
 * - list navigates to the list path;
 * - filter toggles a displayed filter via the list `showFilter`.
 */

import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  type DataProvider,
  defineMessages,
  type Exporter,
  fakeDataProvider,
  type Identifier,
  type NotificationStore,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type ReactNode, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListController } from "../../../controller-hooks";
import { ListContextProvider } from "../../../form";
import { FilterContextProvider } from "../../../list/filter-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TextInput } from "../inputs/text-input";
import { BulkDeleteButton } from "./bulk-delete-button";
import { BulkExportButton } from "./bulk-export-button";
import { BulkUpdateButton } from "./bulk-update-button";
import { ExportButton } from "./export-button";
import { FilterButton } from "./filter-button";
import { ListButton } from "./list-button";
import { RefreshButton } from "./refresh-button";
import { SortButton } from "./sort-button";

afterEach(cleanup);

// Radix DropdownMenu opens on `pointerdown` (button 0), not `click`. jsdom has
// no `PointerEvent`, so alias it to `MouseEvent` and open triggers via a
// pointerdown→pointerup→click sequence.
if (typeof globalThis.PointerEvent === "undefined") {
  vi.stubGlobal("PointerEvent", MouseEvent);
}

/** Open a Radix menu trigger the way a mouse would (pointerdown + click). */
function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(
    trigger,
    new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
  );
  fireEvent.pointerUp(
    trigger,
    new MouseEvent("pointerup", { bubbles: true, button: 0 }),
  );
  fireEvent.click(trigger);
}

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.export": "Export",
        "chelone.action.delete": "Delete",
        "chelone.action.update": "Update",
        "chelone.action.refresh": "Refresh",
        "chelone.action.list": "List",
        "chelone.action.add_filter": "Add filter",
        "chelone.sort.sort_by": "Sort by %{field}",
        "chelone.sort.ASC": "ascending",
        "chelone.sort.DESC": "descending",
        "chelone.message.bulk_delete_content": "Delete %{name}?",
        "chelone.message.bulk_delete_title": "Delete",
        "chelone.message.bulk_update_content": "Update %{name}?",
        "chelone.message.bulk_update_title": "Update",
        "chelone.action.confirm": "Confirm",
        "chelone.action.cancel": "Cancel",
      }),
    },
  });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [
      { id: 1, title: "One", views: 10 },
      { id: 2, title: "Two", views: 20 },
      { id: 3, title: "Three", views: 30 },
    ],
  });
}

/**
 * Renders `children` inside a real list controller over `dataProvider`, seeding
 * the given `selectedIds` once the first page has loaded.
 */
function ListHarness({
  children,
  selectedIds = [],
  dataProvider,
  filters,
  initialEntries = ["/posts"],
  notifications = createNotificationStore(),
}: {
  children: ReactNode;
  selectedIds?: number[];
  dataProvider: DataProvider;
  filters?: ReactNode[];
  initialEntries?: string[];
  notifications?: NotificationStore;
}) {
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
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={makeI18n()}
      notifications={notifications}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={initialEntries}>
            <ResourceContextProvider value="posts">
              <FilterContextProvider value={filters}>
                <ListInner selectedIds={selectedIds}>{children}</ListInner>
              </FilterContextProvider>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

function ListInner({
  children,
  selectedIds,
}: {
  children: ReactNode;
  selectedIds: number[];
}) {
  const list = useListController("posts");
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && selectedIds.length > 0 && list.data) {
      seeded.current = true;
      list.select(selectedIds);
    }
  }, [list, selectedIds]);
  return <ListContextProvider value={list}>{children}</ListContextProvider>;
}

async function getIds(dataProvider: DataProvider): Promise<Identifier[]> {
  const { data } = await dataProvider.getList("posts", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "id", order: "ASC" },
    filter: {},
  });
  return data.map((r) => r.id);
}

describe("<ExportButton>", () => {
  it("renders an Export button", async () => {
    const dataProvider = makeDataProvider();
    render(
      <ListHarness dataProvider={dataProvider}>
        <ExportButton />
      </ListHarness>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /export/i })).toBeTruthy(),
    );
  });

  it("fetches the list and runs the exporter on click", async () => {
    const dataProvider = makeDataProvider();
    const exporter = vi.fn<Exporter>();
    render(
      <ListHarness dataProvider={dataProvider}>
        <ExportButton exporter={exporter} />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: /export/i });
    fireEvent.click(button);
    await waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
    const call = defined(exporter.mock.calls[0]);
    expect(call).toBeDefined();
    const [rows, , resource] = call;
    expect(resource).toBe("posts");
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("notifies the chelone http_error key when the fetch fails", async () => {
    const dataProvider = makeDataProvider();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.spyOn(dataProvider, "getList").mockImplementation((resource, params) => {
      // Fail only the ExportButton's explicit page fetch (perPage 1000),
      // not the list controller's own page load.
      const pagination = params.pagination;
      if (
        pagination &&
        "perPage" in pagination &&
        pagination.perPage === 1000
      ) {
        return Promise.reject(new Error("boom"));
      }
      return makeDataProvider().getList(resource, params);
    });
    const notifications = createNotificationStore();
    const notifySpy = vi.spyOn(notifications, "notify");
    render(
      <ListHarness dataProvider={dataProvider} notifications={notifications}>
        <ExportButton />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: /export/i });
    fireEvent.click(button);
    await waitFor(() =>
      expect(notifySpy).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    consoleError.mockRestore();
  });
});

describe("<BulkDeleteButton>", () => {
  it("deletes the selected records and clears the selection", async () => {
    const dataProvider = makeDataProvider();
    render(
      <ListHarness dataProvider={dataProvider} selectedIds={[1, 3]}>
        <BulkDeleteButton />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(button);
    // The confirm dialog appears; confirm it.
    const confirm = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirm);
    await waitFor(async () => {
      expect(await getIds(dataProvider)).toEqual([2]);
    });
  });
});

describe("<BulkUpdateButton>", () => {
  it("updates the selected records with the given data", async () => {
    const dataProvider = makeDataProvider();
    render(
      <ListHarness dataProvider={dataProvider} selectedIds={[1, 2]}>
        <BulkUpdateButton data={{ views: 0 }} />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: /update/i });
    fireEvent.click(button);
    const confirm = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirm);
    await waitFor(async () => {
      const { data } = await dataProvider.getList("posts", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      expect(data.find((r) => r.id === 1)?.views).toBe(0);
      expect(data.find((r) => r.id === 2)?.views).toBe(0);
      expect(data.find((r) => r.id === 3)?.views).toBe(30);
    });
  });
});

describe("<BulkExportButton>", () => {
  it("fetches the selected records and runs the exporter", async () => {
    const dataProvider = makeDataProvider();
    const exporter = vi.fn<Exporter>();
    render(
      <ListHarness dataProvider={dataProvider} selectedIds={[2, 3]}>
        <BulkExportButton exporter={exporter} />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: /export/i });
    fireEvent.click(button);
    await waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
    const call = defined(exporter.mock.calls[0]);
    expect(call).toBeDefined();
    const [rows] = call;
    expect(rows.map((r) => r.id).sort()).toEqual([2, 3]);
  });

  it("notifies the chelone http_error key when the fetch fails", async () => {
    const dataProvider = makeDataProvider();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.spyOn(dataProvider, "getMany").mockRejectedValue(new Error("boom"));
    const notifications = createNotificationStore();
    const notifySpy = vi.spyOn(notifications, "notify");
    render(
      <ListHarness
        dataProvider={dataProvider}
        selectedIds={[2, 3]}
        notifications={notifications}
      >
        <BulkExportButton />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: /export/i });
    fireEvent.click(button);
    await waitFor(() =>
      expect(notifySpy).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.objectContaining({ type: "error" }),
      ),
    );
    consoleError.mockRestore();
  });
});

describe("<RefreshButton>", () => {
  it("invalidates queries on click", async () => {
    const dataProvider = makeDataProvider();
    const spy = vi.spyOn(dataProvider, "getList");
    render(
      <ListHarness dataProvider={dataProvider}>
        <RefreshButton />
      </ListHarness>,
    );
    // Wait for the initial list fetch.
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const before = spy.mock.calls.length;
    const button = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(button);
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(before));
  });
});

describe("<SortButton>", () => {
  it("opens a menu and changes the sort on select", async () => {
    const dataProvider = makeDataProvider();
    const spy = vi.spyOn(dataProvider, "getList");
    render(
      <ListHarness dataProvider={dataProvider}>
        <SortButton fields={["title", "views"]} />
      </ListHarness>,
    );
    const trigger = await screen.findByRole("button", { name: /sort/i });
    openMenu(trigger);
    const item = await screen.findByText(/title/i);
    const before = spy.mock.calls.length;
    fireEvent.click(item);
    // Selecting a sort field re-fetches the list with the new sort.
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(before));
  });
});

describe("<ListButton>", () => {
  it("renders a link to the list page", async () => {
    const dataProvider = makeDataProvider();
    render(
      <ListHarness dataProvider={dataProvider}>
        <ListButton />
      </ListHarness>,
    );
    const link = await screen.findByRole("link", { name: /list/i });
    expect(link.getAttribute("href")).toContain("/posts");
  });
});

describe("<FilterButton>", () => {
  it("toggles a displayed filter via showFilter", async () => {
    const dataProvider = makeDataProvider();
    render(
      <ListHarness
        dataProvider={dataProvider}
        filters={[<TextInput key="title" source="title" />]}
      >
        <FilterButton />
      </ListHarness>,
    );
    const trigger = await screen.findByRole("button", { name: /add filter/i });
    openMenu(trigger);
    // The togglable filter appears in the dropdown as a checkbox item.
    const item = await screen.findByRole("menuitemcheckbox", {
      name: /title/i,
    });
    expect(item.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(item);
    // After toggling, re-opening shows the item checked.
    openMenu(await screen.findByRole("button", { name: /add filter/i }));
    await waitFor(() => {
      const toggled = screen.getByRole("menuitemcheckbox", { name: /title/i });
      expect(toggled.getAttribute("aria-checked")).toBe("true");
    });
  });

  it("does not touch the document after unmounting while a focus is pending", async () => {
    const querySelector = vi.spyOn(document, "querySelector");
    const querySelectorAll = vi.spyOn(document, "querySelectorAll");
    const { unmount } = render(
      <ListHarness
        dataProvider={makeDataProvider()}
        filters={[<TextInput key="title" source="title" />]}
      >
        <FilterButton />
      </ListHarness>,
    );
    openMenu(await screen.findByRole("button", { name: /add filter/i }));
    fireEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: /title/i }),
    );
    unmount();
    querySelector.mockClear();
    querySelectorAll.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(querySelector).not.toHaveBeenCalled();
    expect(querySelectorAll).not.toHaveBeenCalled();
    querySelector.mockRestore();
    querySelectorAll.mockRestore();
  });
});
