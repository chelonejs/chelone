/**
 * `<TreeList>`: the records of the ambient `<List>` as a collapsible tree built
 * from a parent field. Mounted as `<MemoryRouter><Admin><Resource list edit
 * show/></Admin></MemoryRouter>` (the app's composition); assertions are on DOM,
 * roles, hrefs and data-provider calls.
 */
import {
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { HashRouter, MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../../admin/admin";
import { Resource } from "../../../resource";
import { List } from "../views/list";
import { TreeList, type TreeListProps } from "./tree-list";

afterEach(cleanup);

const CATEGORIES = [
  { id: 1, name: "Root A", slug: "a", kind: "folder", parent_id: null },
  { id: 2, name: "Child A1", slug: "a1", kind: "file", parent_id: 1 },
  { id: 3, name: "Grandchild A1x", slug: "a1x", kind: "file", parent_id: 2 },
  { id: 4, name: "Root B", slug: "b", kind: "folder", parent_id: null },
];

const FolderIcon = ({ className }: { className?: string }) => (
  <svg data-testid="folder-icon" className={className} />
);
const FileIcon = ({ className }: { className?: string }) => (
  <svg data-testid="file-icon" className={className} />
);

function Path() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function mount({
  tree = {},
  dataProvider = fakeDataProvider({ categories: CATEGORIES }),
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
  edit = true,
  show = true,
  hash = false,
}: {
  hash?: boolean;
  tree?: Partial<TreeListProps>;
  dataProvider?: DataProvider;
  queryClient?: QueryClient;
  edit?: boolean;
  show?: boolean;
} = {}) {
  const View = () => null;
  const list = (): ReactNode => (
    <List>
      <TreeList parentSource="parent_id" {...tree} />
    </List>
  );
  const Router = hash ? HashRouter : MemoryRouter;
  return render(
    <Router {...(hash ? {} : { initialEntries: ["/categories"] })}>
      <Path />
      <Admin
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
        notifications={createNotificationStore()}
      >
        <Resource
          name="categories"
          list={list}
          edit={edit ? View : undefined}
          show={show ? View : undefined}
        />
      </Admin>
    </Router>,
  );
}

const treeItems = () => screen.queryAllByRole("treeitem");
const titleOf = (item: HTMLElement) =>
  item.querySelector("[data-slot=tree-list-title]")?.textContent;
const titles = () => treeItems().map(titleOf);
const item = (title: string) => {
  const found = treeItems().find((node) => titleOf(node) === title);
  if (!found) throw new Error(`no tree item titled ${title}`);
  return found;
};
const chevron = (title: string) =>
  item(title).querySelector("button[data-slot=tree-list-chevron]");
const row = (title: string) =>
  elementOf(
    item(title).querySelector("[data-slot=tree-list-row]"),
    HTMLElement,
  );
const path = () => screen.getByTestId("path").textContent;

describe("<TreeList>", () => {
  it("renders roots and, once expanded, nested children at the right depth", async () => {
    mount();
    await screen.findByRole("tree");
    expect(titles()).toEqual(["Root A", "Root B"]);

    fireEvent.click(
      within(item("Root A")).getByRole("button", { name: "Expand" }),
    );
    expect(titles()).toEqual(["Root A", "Child A1", "Root B"]);

    fireEvent.click(
      within(item("Child A1")).getByRole("button", { name: "Expand" }),
    );
    expect(titles()).toEqual([
      "Root A",
      "Child A1",
      "Grandchild A1x",
      "Root B",
    ]);
    expect(treeItems().map((node) => node.getAttribute("aria-level"))).toEqual([
      "1",
      "2",
      "3",
      "1",
    ]);
    expect(
      item("Child A1").querySelector('[role="group"] > [role="treeitem"]'),
    ).not.toBeNull();
  });

  it("starts collapsed and shows children with defaultExpanded", async () => {
    mount();
    await screen.findByRole("tree");
    expect(item("Root A").getAttribute("aria-expanded")).toBe("false");
    cleanup();

    mount({ tree: { defaultExpanded: true } });
    await screen.findByRole("tree");
    expect(titles()).toEqual([
      "Root A",
      "Child A1",
      "Grandchild A1x",
      "Root B",
    ]);
    expect(item("Root A").getAttribute("aria-expanded")).toBe("true");
  });

  it("the chevron expands and collapses a branch without selecting it", async () => {
    const onSelect = vi.fn();
    mount({ tree: { onSelect } });
    await screen.findByRole("tree");

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(item("Root A").getAttribute("aria-expanded")).toBe("true");
    expect(
      within(item("Root A")).getAllByRole("button", { name: "Collapse" }),
    ).toHaveLength(1);

    fireEvent.click(defined(chevron("Root A")));
    expect(titles()).toEqual(["Root A", "Root B"]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(path()).toBe("/categories");
  });

  it("a leaf has no chevron and no aria-expanded", async () => {
    mount();
    await screen.findByRole("tree");

    expect(chevron("Root B")).toBeNull();
    expect(item("Root B").hasAttribute("aria-expanded")).toBe(false);
  });

  it("titleSource wins over the record representation", async () => {
    mount();
    await screen.findByRole("tree");
    expect(titles()).toEqual(["Root A", "Root B"]);
    cleanup();

    mount({ tree: { titleSource: "slug" } });
    await screen.findByRole("tree");
    expect(titles()).toEqual(["a", "b"]);
  });

  it("iconSource picks the component from iconMap", async () => {
    mount({
      tree: {
        iconSource: "kind",
        iconMap: { folder: FolderIcon, file: FileIcon },
        defaultExpanded: true,
      },
    });
    await screen.findByRole("tree");

    expect(
      within(item("Root A")).getAllByTestId("folder-icon")[0],
    ).toBeTruthy();
    expect(
      row("Child A1").querySelector("[data-testid=file-icon]"),
    ).not.toBeNull();
    expect(
      row("Root B").querySelector("[data-testid=folder-icon]"),
    ).not.toBeNull();
  });

  it("titleSource and iconSource read a bracket path", async () => {
    const nested = CATEGORIES.map((category) => ({
      id: category.id,
      parent_id: category.parent_id,
      meta: {
        labels: [{ text: category.slug }],
        kinds: [category.kind],
      },
    }));
    mount({
      dataProvider: fakeDataProvider({ categories: nested }),
      tree: {
        titleSource: "meta.labels[0].text",
        iconSource: "meta.kinds[0]",
        iconMap: { folder: FolderIcon, file: FileIcon },
      },
    });
    await screen.findByRole("tree");

    expect(titles()).toEqual(["a", "b"]);
    expect(row("a").querySelector("[data-testid=folder-icon]")).not.toBeNull();
  });

  it("onSelect receives the record when a row is clicked or Enter is pressed", async () => {
    const onSelect = vi.fn();
    mount({ tree: { onSelect } });
    await screen.findByRole("tree");

    fireEvent.click(row("Root B"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith(CATEGORIES[3]);

    item("Root A").focus();
    fireEvent.keyDown(item("Root A"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(CATEGORIES[0]);

    fireEvent.keyDown(item("Root A"), { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(path()).toBe("/categories");
  });

  it("a row links to the edit page, or the show page when there is no edit view", async () => {
    mount();
    await screen.findByRole("tree");
    expect(row("Root B").getAttribute("href")).toBe("/categories/4");
    fireEvent.click(row("Root B"));
    await waitFor(() => expect(path()).toBe("/categories/4"));
    cleanup();

    mount({ edit: false });
    await screen.findByRole("tree");
    expect(row("Root B").getAttribute("href")).toBe("/categories/4/show");
    cleanup();

    mount({ tree: { linkType: "show" } });
    await screen.findByRole("tree");
    expect(row("Root B").getAttribute("href")).toBe("/categories/4/show");
  });

  it("a row link follows the host router, so a hash router gives a hash href", async () => {
    window.location.hash = "#/categories";
    mount({ hash: true });
    await screen.findByRole("tree");

    expect(row("Root B").getAttribute("href")).toBe("#/categories/4");
    window.location.hash = "";
  });

  it("linkType false leaves rows inert", async () => {
    mount({ tree: { linkType: false } });
    await screen.findByRole("tree");

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    fireEvent.click(row("Root B"));
    fireEvent.keyDown(item("Root B"), { key: "Enter" });
    expect(path()).toBe("/categories");
  });

  it("arrow keys expand, collapse and move focus", async () => {
    mount();
    await screen.findByRole("tree");
    const focused = () =>
      titleOf(elementOf(document.activeElement, HTMLElement));
    const press = (title: string, key: string) =>
      fireEvent.keyDown(item(title), { key });

    item("Root A").focus();
    press("Root A", "ArrowRight");
    expect(item("Root A").getAttribute("aria-expanded")).toBe("true");
    expect(titles()).toEqual(["Root A", "Child A1", "Root B"]);

    press("Root A", "ArrowRight");
    expect(focused()).toBe("Child A1");

    press("Child A1", "ArrowDown");
    expect(focused()).toBe("Root B");

    press("Root B", "ArrowUp");
    expect(focused()).toBe("Child A1");

    press("Child A1", "ArrowLeft");
    expect(focused()).toBe("Root A");

    press("Root A", "ArrowLeft");
    expect(item("Root A").getAttribute("aria-expanded")).toBe("false");
    expect(titles()).toEqual(["Root A", "Root B"]);
  });

  it("keeps a branch open across a refetch", async () => {
    let rows: LooseRecord[] = CATEGORIES;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const dataProvider: DataProvider = {
      ...fakeDataProvider({ categories: CATEGORIES }),
      getList: async () => ({ data: rows, total: rows.length }),
    };
    mount({ dataProvider, queryClient });
    await screen.findByRole("tree");
    fireEvent.click(defined(chevron("Root A")));

    rows = [
      ...CATEGORIES,
      { id: 5, name: "Root C", slug: "c", kind: "folder", parent_id: null },
    ];
    await act(() => queryClient.invalidateQueries());

    await waitFor(() =>
      expect(titles()).toEqual(["Root A", "Child A1", "Root B", "Root C"]),
    );
    expect(item("Root A").getAttribute("aria-expanded")).toBe("true");
  });

  it("lists every record when the parent field has a cycle", async () => {
    const cyclic = [
      { id: 1, name: "One", parent_id: 2 },
      { id: 2, name: "Two", parent_id: 3 },
      { id: 3, name: "Three", parent_id: 1 },
    ];
    mount({
      dataProvider: fakeDataProvider({ categories: cyclic }),
      tree: { defaultExpanded: true },
    });
    await screen.findByRole("tree");

    expect(titles().sort()).toEqual(["One", "Three", "Two"]);
  });

  it("renders the empty state with no records and the loading state while pending", async () => {
    mount({
      dataProvider: fakeDataProvider({ categories: [] }),
      tree: { empty: <p>Nothing here</p> },
    });
    expect(await screen.findByText("Nothing here")).toBeTruthy();
    expect(screen.queryByText("No results found")).toBeNull();
    expect(screen.queryByRole("tree")).toBeNull();
    cleanup();

    mount({ dataProvider: fakeDataProvider({ categories: [] }) });
    expect(await screen.findByText("No results found")).toBeTruthy();
    cleanup();

    const pending: DataProvider = {
      ...fakeDataProvider({ categories: CATEGORIES }),
      getList: () => new Promise(() => {}),
    };
    mount({ dataProvider: pending, tree: { loading: <p>Fetching</p> } });
    expect(await screen.findByText("Fetching")).toBeTruthy();
    expect(screen.queryByRole("tree")).toBeNull();
  });
});
