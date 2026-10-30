/**
 * `useSavedQueries` and `<SavedQueriesList>`: named list queries persisted in
 * the KV store, applied to the ambient list with one `setParams` call. Mounted
 * under a real `<CheloneProvider>` with a real store; assertions are on DOM,
 * roles, the store and data-provider calls.
 */
import {
  type CheloneStore,
  createI18n,
  createStore,
  defineMessages,
  fakeDataProvider,
  type SavedQuery,
  type SavedQueryValue,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  ListContextProvider,
  type ListContextValue,
  useListContext,
} from "../../../form";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { useSavedQueries } from "../../../saved-queries-hooks";
import { List } from "../views/list";
import { SavedQueriesList } from "./saved-queries-list";

afterEach(cleanup);

const savedValue = (title: string, perPage = 10): SavedQueryValue => ({
  filter: { title },
  displayedFilters: { title: true },
  sort: [{ field: "id", order: "DESC" }],
  perPage,
});

function providers(store: CheloneStore) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  // Built once per mount helper: a provider or client recreated on render would
  // discard the query cache.
  const dataProvider = fakeDataProvider({});
  const queryClient = new QueryClient();
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={i18n}
        store={store}
      >
        {children}
      </CheloneProvider>
    );
  };
}

describe("useSavedQueries", () => {
  it("returns the persisted queries and updates on save and remove", () => {
    const store = createStore();
    const stored: SavedQuery[] = [
      { label: "Hello", value: savedValue("hello") },
    ];
    store.setItem("posts.savedQueries", stored);
    const { result } = renderHook(() => useSavedQueries("posts"), {
      wrapper: providers(store),
    });
    expect(result.current.queries.map((q) => q.label)).toEqual(["Hello"]);

    act(() => result.current.save("World", savedValue("world")));
    expect(result.current.queries.map((q) => q.label)).toEqual([
      "Hello",
      "World",
    ]);
    expect(
      store.getItem<SavedQuery[]>("posts.savedQueries")?.map((q) => q.label),
    ).toEqual(["Hello", "World"]);

    act(() => result.current.remove("Hello"));
    expect(result.current.queries.map((q) => q.label)).toEqual(["World"]);
  });

  it("follows a change written to the store by another instance", () => {
    const store = createStore();
    const wrapper = providers(store);
    const a = renderHook(() => useSavedQueries("posts"), { wrapper });
    const b = renderHook(() => useSavedQueries("posts"), { wrapper });

    act(() => a.result.current.save("Shared", savedValue("shared")));
    expect(b.result.current.queries.map((q) => q.label)).toEqual(["Shared"]);

    act(() => b.result.current.remove("Shared"));
    expect(a.result.current.queries).toEqual([]);
  });

  it("reads the storeKey option instead of the resource name", () => {
    const store = createStore();
    const { result } = renderHook(
      () => useSavedQueries("posts", { storeKey: "custom" }),
      { wrapper: providers(store) },
    );
    act(() => result.current.save("A", savedValue("a")));
    expect(store.getItem("custom.savedQueries")).toBeDefined();
    expect(store.getItem("posts.savedQueries")).toBeUndefined();
  });
});

/** The rows of the ambient list, to wait on a settled fetch. */
function Rows() {
  const { data } = useListContext();
  return (
    <ul>
      {(data ?? []).map((row) => (
        <li key={String(row.id)}>
          {String((row as { title?: unknown }).title)}
        </li>
      ))}
    </ul>
  );
}

function makeList(overrides: Partial<ListContextValue> = {}): ListContextValue {
  return {
    page: 1,
    perPage: 10,
    sort: [{ field: "id", order: "DESC" }],
    filter: {},
    displayedFilters: {},
    selectedIds: [],
    data: [],
    total: 0,
    pageInfo: undefined,
    isPending: false,
    isFetching: false,
    error: null,
    hasNextPage: false,
    hasPreviousPage: false,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    setSort: vi.fn(),
    setFilters: vi.fn(),
    setParams: vi.fn(),
    showFilter: vi.fn(),
    hideFilter: vi.fn(),
    select: vi.fn(),
    toggleItem: vi.fn(),
    unselectAll: vi.fn(),
    selectAll: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  } as ListContextValue;
}

function mountList(
  list: ListContextValue,
  store: CheloneStore,
  ui: ReactNode = <SavedQueriesList />,
) {
  const Providers = providers(store);
  const tree = (value: ListContextValue) => (
    <Providers>
      <ResourceContextProvider value="posts">
        <ListContextProvider value={value}>{ui}</ListContextProvider>
      </ResourceContextProvider>
    </Providers>
  );
  const view = render(tree(list));
  return {
    ...view,
    setList: (next: ListContextValue) => view.rerender(tree(next)),
  };
}

const seeded = (): CheloneStore => {
  const store = createStore();
  store.setItem<SavedQuery[]>("posts.savedQueries", [
    { label: "Hello posts", value: savedValue("hello", 10) },
    { label: "World posts", value: savedValue("world", 25) },
  ]);
  return store;
};

describe("<SavedQueriesList>", () => {
  it("lists the saved queries of the resource", () => {
    const store = seeded();
    store.setItem<SavedQuery[]>("comments.savedQueries", [
      { label: "Other resource", value: savedValue("x") },
    ]);
    mountList(makeList(), store);
    expect(screen.getByRole("button", { name: "Hello posts" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "World posts" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Other resource" })).toBeNull();
  });

  it("lists the queries of an explicit resource prop", () => {
    const store = createStore();
    store.setItem<SavedQuery[]>("comments.savedQueries", [
      { label: "Other resource", value: savedValue("x") },
    ]);
    mountList(makeList(), store, <SavedQueriesList resource="comments" />);
    expect(screen.getByRole("button", { name: "Other resource" })).toBeTruthy();
  });

  it("clicking a query calls setParams once with its filter, displayedFilters, sort and perPage", () => {
    const list = makeList();
    mountList(list, seeded());
    fireEvent.click(screen.getByRole("button", { name: "World posts" }));
    expect(list.setParams).toHaveBeenCalledTimes(1);
    expect(list.setParams).toHaveBeenCalledWith({
      filter: { title: "world" },
      displayedFilters: { title: true },
      sort: [{ field: "id", order: "DESC" }],
      perPage: 25,
    });
  });

  it("marks the query matching the list with aria-pressed and clicking it clears the filter", () => {
    const list = makeList({ filter: { title: "hello" }, perPage: 10 });
    mountList(list, seeded());
    const active = screen.getByRole("button", { name: "Hello posts" });
    expect(active.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "World posts" })
        .getAttribute("aria-pressed"),
    ).toBe("false");

    fireEvent.click(active);
    expect(list.setParams).toHaveBeenCalledTimes(1);
    expect(list.setParams).toHaveBeenCalledWith({ filter: {} });
  });

  it("saves the current params under the typed name", () => {
    const store = createStore();
    const list = makeList({
      filter: { title: "draft" },
      displayedFilters: { title: true },
      perPage: 5,
    });
    mountList(list, store);
    fireEvent.click(screen.getByRole("button", { name: "Save current query" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Query name" }), {
      target: { value: "  My drafts " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(store.getItem("posts.savedQueries")).toEqual([
      {
        label: "My drafts",
        value: {
          filter: { title: "draft" },
          displayedFilters: { title: true },
          sort: [{ field: "id", order: "DESC" }],
          perPage: 5,
        },
      },
    ]);
    // The form closes and the new query is listed.
    expect(screen.queryByRole("textbox", { name: "Query name" })).toBeNull();
    expect(screen.getByRole("button", { name: "My drafts" })).toBeTruthy();
  });

  it("offers no save while the filter is empty or a saved query already matches", () => {
    const saveButton = () =>
      screen.queryByRole("button", { name: "Save current query" });
    const view = mountList(makeList({ filter: {} }), seeded());
    expect(saveButton()).toBeNull();

    view.setList(makeList({ filter: { title: "hello" }, perPage: 10 }));
    expect(saveButton()).toBeNull();

    view.setList(makeList({ filter: { title: "other" }, perPage: 10 }));
    expect(saveButton()).not.toBeNull();
  });

  it("closes the name form when the list stops being saveable", () => {
    const view = mountList(
      makeList({ filter: { title: "draft" } }),
      createStore(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save current query" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Query name" }), {
      target: { value: "Foo" },
    });

    view.setList(makeList({ filter: {} }));
    expect(screen.queryByRole("textbox", { name: "Query name" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Save current query" }),
    ).toBeNull();

    // Saveable again: the button is back, not a form still holding "Foo".
    view.setList(makeList({ filter: { title: "next" } }));
    expect(screen.queryByRole("textbox", { name: "Query name" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save current query" }));
    expect(
      (screen.getByRole("textbox", { name: "Query name" }) as HTMLInputElement)
        .value,
    ).toBe("");
  });

  it("saving an existing name replaces that query", () => {
    const store = seeded();
    mountList(makeList({ filter: { title: "fresh" }, perPage: 10 }), store);
    fireEvent.click(screen.getByRole("button", { name: "Save current query" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Query name" }), {
      target: { value: "Hello posts" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const saved = store.getItem<SavedQuery[]>("posts.savedQueries");
    expect(saved?.map((q) => q.label)).toEqual(["Hello posts", "World posts"]);
    expect(saved?.[0]?.value.filter).toEqual({ title: "fresh" });
  });

  it("saves and removes under an explicit resource prop", () => {
    const store = createStore();
    mountList(
      makeList({ filter: { title: "draft" } }),
      store,
      <SavedQueriesList resource="comments" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save current query" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Query name" }), {
      target: { value: "Mine" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      store.getItem<SavedQuery[]>("comments.savedQueries")?.map((q) => q.label),
    ).toEqual(["Mine"]);
    expect(store.getItem("posts.savedQueries")).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: /Remove.*Mine/ }));
    expect(store.getItem<SavedQuery[]>("comments.savedQueries")).toEqual([]);
  });

  it("cannot save a blank name", () => {
    const store = createStore();
    mountList(makeList({ filter: { title: "draft" } }), store);
    fireEvent.click(screen.getByRole("button", { name: "Save current query" }));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Query name" }), {
      target: { value: "   " },
    });
    expect(save).toHaveProperty("disabled", true);
    fireEvent.click(save);
    expect(store.getItem("posts.savedQueries")).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox", { name: "Query name" })).toBeNull();
  });

  it("remove deletes only that query from the store", () => {
    const store = seeded();
    const list = makeList();
    mountList(list, store);
    fireEvent.click(
      screen.getByRole("button", { name: /Remove.*Hello posts/ }),
    );
    expect(
      store.getItem<SavedQuery[]>("posts.savedQueries")?.map((q) => q.label),
    ).toEqual(["World posts"]);
    expect(screen.queryByRole("button", { name: "Hello posts" })).toBeNull();
    expect(screen.getByRole("button", { name: "World posts" })).toBeTruthy();
    expect(list.setParams).not.toHaveBeenCalled();
  });

  it("removing the active query leaves the list params and offers to save again", () => {
    const store = seeded();
    const list = makeList({ filter: { title: "hello" }, perPage: 10 });
    mountList(list, store);
    fireEvent.click(
      screen.getByRole("button", { name: /Remove.*Hello posts/ }),
    );
    expect(list.setParams).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Hello posts" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Save current query" }),
    ).toBeTruthy();
  });

  it("under <List> applying a query makes one getList call with its filter", async () => {
    const dataProvider = fakeDataProvider({
      posts: [
        { id: 1, title: "hello" },
        { id: 2, title: "world" },
      ],
    });
    const getList = vi.spyOn(dataProvider, "getList");
    const store = createStore();
    store.setItem<SavedQuery[]>("posts.savedQueries", [
      {
        label: "Only hello",
        value: {
          ...savedValue("hello", 25),
          sort: [{ field: "id", order: "ASC" }],
        },
      },
    ]);
    const i18n = createI18n({
      locale: "en",
      messages: { en: defineMessages({}) },
    });
    const queryClient = new QueryClient();
    render(
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={i18n}
        store={store}
      >
        <ResourceRegistryProvider>
          <ResourceContextProvider value="posts">
            <List>
              <SavedQueriesList />
              <Rows />
            </List>
          </ResourceContextProvider>
        </ResourceRegistryProvider>
      </CheloneProvider>,
    );
    await vi.waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(2),
    );
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList.mock.calls[0]?.[1]?.filter).toEqual({});

    fireEvent.click(screen.getByRole("button", { name: "Only hello" }));
    // The filtered page has rendered, so the fetch has settled.
    await vi.waitFor(() =>
      expect(
        screen.getAllByRole("listitem").map((li) => li.textContent),
      ).toEqual(["hello"]),
    );
    expect(
      screen
        .getByRole("button", { name: "Only hello" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(getList).toHaveBeenCalledTimes(2);
    const params = getList.mock.calls[1]?.[1];
    expect(params?.filter).toEqual({ title: "hello" });
    expect(params?.sort).toEqual({ field: "id", order: "ASC" });
    expect(params?.pagination).toEqual({ page: 1, perPage: 25 });
  });
});
