/**
 * P7d-T3 — `<ReferenceManyField>` ported onto chelone data hooks.
 *
 * Resolves the records of `reference` whose `target` field points back at the
 * current record's id (a reverse FK / one-to-many), drops them in a client-side
 * `ListContext`, and renders its children. Rebridge note: chelone has no
 * `ReferenceManyFieldBase`; the field composes `useGetList` (with a
 * `{ [target]: id }` filter — the intended chelone path per the data-provider
 * contract) + `useList` + `ListContextProvider`.
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
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { DataTable } from "../list/data-table";
import { ListPagination } from "../list/list-pagination";
import { ReferenceManyField } from "./reference-many-field";

const books = [
  { id: 1, title: "Hello", author_id: 1, year: 2020 },
  { id: 2, title: "World", author_id: 1, year: 2022 },
  { id: 3, title: "Foo", author_id: 1, year: 2021 },
  { id: 4, title: "Other", author_id: 2, year: 2019 },
];

function makeProviders() {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  const dataProvider = fakeDataProvider({
    books: structuredClone(books),
    authors: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "books",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={i18n}
      >
        <ResourceRegistryProvider registry={registry}>
          {children}
        </ResourceRegistryProvider>
      </CheloneProvider>
    );
  }
  return Providers;
}

interface Book {
  id: number;
  title: string;
  year: number;
}

function BookList() {
  const { data = [] } = useListContext();
  return (
    <ul>
      {(data as Book[]).map((b) => (
        <li key={b.id}>{`${b.title} (${b.year})`}</li>
      ))}
    </ul>
  );
}

afterEach(cleanup);

describe("<ReferenceManyField>", () => {
  it("renders the related records whose target matches the record id", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyField reference="books" target="author_id">
            <BookList />
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Hello (2020)")).toBeTruthy();
    });
    expect(screen.getByText("World (2022)")).toBeTruthy();
    expect(screen.getByText("Foo (2021)")).toBeTruthy();
    // The book for author 2 must NOT appear.
    expect(screen.queryByText("Other (2019)")).toBeNull();
  });

  it("applies the sort prop to the related list", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyField
            reference="books"
            target="author_id"
            sort={{ field: "year", order: "ASC" }}
          >
            <BookList />
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Hello (2020)")).toBeTruthy();
    });
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Hello (2020)", "Foo (2021)", "World (2022)"]);
  });
});

// Server-side paging, sorting, filtering and selection: the field asks the
// provider's `getManyReference` for every change instead of slicing in memory.

const pagedBooks = [
  { id: 1, title: "Hello", author_id: 1, year: 2020 },
  { id: 2, title: "World", author_id: 1, year: 2022 },
  { id: 3, title: "Foo", author_id: 1, year: 2021 },
  { id: 4, title: "Other", author_id: 2, year: 2019 },
  { id: 5, title: "Another", author_id: 2, year: 2018 },
  { id: 6, title: "Third", author_id: 2, year: 2017 },
];

function makeServerProviders() {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  const dataProvider = fakeDataProvider({
    books: structuredClone(pagedBooks),
    authors: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "books",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  function Providers({ children }: { children: ReactNode }) {
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
  return {
    Providers,
    manyReferenceSpy: vi.spyOn(dataProvider, "getManyReference"),
    listSpy: vi.spyOn(dataProvider, "getList"),
  };
}

/** Shows the list context and exposes its actions as buttons. */
function Probe() {
  const {
    data = [],
    page,
    selectedIds,
    setPage,
    setFilters,
    toggleItem,
    unselectAll,
  } = useListContext();
  return (
    <div>
      <ul>
        {(data as Book[]).map((b) => (
          <li key={b.id}>{b.title}</li>
        ))}
      </ul>
      <output>{`page ${page}`}</output>
      <output>{`selected [${selectedIds.join(",")}]`}</output>
      <button type="button" onClick={() => setPage(2)}>
        go to page 2
      </button>
      <button type="button" onClick={() => toggleItem(1)}>
        toggle 1
      </button>
      <button type="button" onClick={() => toggleItem(3)}>
        toggle 3
      </button>
      <button type="button" onClick={() => toggleItem(4)}>
        toggle 4
      </button>
      <button type="button" onClick={() => unselectAll()}>
        unselect all
      </button>
      <button type="button" onClick={() => setFilters({ title: "Foo" })}>
        filter Foo
      </button>
      <button type="button" onClick={() => setFilters({ title: "Hello" })}>
        filter Hello
      </button>
    </div>
  );
}

describe("<ReferenceManyField>", () => {
  it("calls getManyReference with the target, the record id and the first page and never getList", async () => {
    const { Providers, manyReferenceSpy, listSpy } = makeServerProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyField reference="books" target="author_id">
            <Probe />
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeTruthy();
    });
    expect(manyReferenceSpy).toHaveBeenCalledWith(
      "books",
      expect.objectContaining({
        target: "author_id",
        id: 1,
        pagination: { page: 1, perPage: 25 },
        sort: { field: "id", order: "ASC" },
      }),
    );
    expect(listSpy).not.toHaveBeenCalled();
  });

  it("perPage 2 shows two rows and the next page button of ListPagination fetches page 2 from the provider", async () => {
    const { Providers, manyReferenceSpy } = makeServerProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyField reference="books" target="author_id" perPage={2}>
            <DataTable>
              <DataTable.Col source="title" />
            </DataTable>
            <ListPagination />
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeTruthy();
    });
    expect(screen.getByText("World")).toBeTruthy();
    expect(screen.queryByText("Foo")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Foo")).toBeTruthy();
    });
    expect(screen.queryByText("Hello")).toBeNull();
    expect(manyReferenceSpy).toHaveBeenLastCalledWith(
      "books",
      expect.objectContaining({ pagination: { page: 2, perPage: 2 } }),
    );
  });

  it("a DataTable column header click sorts on the server", async () => {
    const { Providers, manyReferenceSpy } = makeServerProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyField reference="books" target="author_id">
            <DataTable>
              <DataTable.Col source="title" />
            </DataTable>
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeTruthy();
    });

    const header = screen.getByRole("columnheader", { name: /title/i });
    fireEvent.click(within(header).getByRole("button"));

    await waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenLastCalledWith(
        "books",
        expect.objectContaining({ sort: { field: "title", order: "ASC" } }),
      );
    });
    await waitFor(() => {
      const cells = screen.getAllByRole("cell").map((c) => c.textContent);
      expect(cells).toEqual(["Foo", "Hello", "World"]);
    });
  });

  it("setFilters from the list context reaches the provider and the filter prop stays applied", async () => {
    const { Providers, manyReferenceSpy } = makeServerProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyField
            reference="books"
            target="author_id"
            filter={{ year: 2021 }}
          >
            <Probe />
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Foo")).toBeTruthy();
    });
    expect(screen.queryByText("Hello")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "filter Foo" }));
    await waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenLastCalledWith(
        "books",
        expect.objectContaining({ filter: { title: "Foo", year: 2021 } }),
      );
    });
    expect(screen.getByText("Foo")).toBeTruthy();

    // Hello is a 2020 book: the year 2021 filter prop still applies.
    fireEvent.click(screen.getByRole("button", { name: "filter Hello" }));
    await waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenLastCalledWith(
        "books",
        expect.objectContaining({ filter: { title: "Hello", year: 2021 } }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Foo")).toBeNull();
    });
    expect(screen.queryByText("Hello")).toBeNull();
  });

  it("selected rows stay selected across pages and unselectAll clears them", async () => {
    const { Providers } = makeServerProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyField reference="books" target="author_id" perPage={2}>
            <Probe />
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "toggle 1" }));
    expect(screen.getByText("selected [1]")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "go to page 2" }));
    await waitFor(() => {
      expect(screen.getByText("Foo")).toBeTruthy();
    });
    expect(screen.getByText("selected [1]")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "toggle 3" }));
    expect(screen.getByText("selected [1,3]")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "unselect all" }));
    expect(screen.getByText("selected []")).toBeTruthy();
  });

  it("two records keep separate pages and selections", async () => {
    const { Providers } = makeServerProviders();
    render(
      <Providers>
        <div data-testid="first">
          <ReferenceManyField
            reference="books"
            target="author_id"
            perPage={2}
            record={{ id: 1 }}
          >
            <Probe />
          </ReferenceManyField>
        </div>
        <div data-testid="second">
          <ReferenceManyField
            reference="books"
            target="author_id"
            perPage={2}
            record={{ id: 2 }}
          >
            <Probe />
          </ReferenceManyField>
        </div>
      </Providers>,
    );
    const first = within(screen.getByTestId("first"));
    const second = within(screen.getByTestId("second"));
    await waitFor(() => {
      expect(first.getByText("Hello")).toBeTruthy();
      expect(second.getByText("Other")).toBeTruthy();
    });

    fireEvent.click(first.getByRole("button", { name: "go to page 2" }));
    fireEvent.click(first.getByRole("button", { name: "toggle 1" }));

    await waitFor(() => {
      expect(first.getByText("Foo")).toBeTruthy();
    });
    expect(first.getByText("page 2")).toBeTruthy();
    expect(first.getByText("selected [1]")).toBeTruthy();
    expect(second.getByText("page 1")).toBeTruthy();
    expect(second.getByText("selected []")).toBeTruthy();
    expect(second.getByText("Other")).toBeTruthy();
  });

  it("without a record id fetches nothing and renders an empty list", async () => {
    const { Providers, manyReferenceSpy, listSpy } = makeServerProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ name: "Draft" } as never}>
          <ReferenceManyField reference="books" target="author_id">
            <Probe />
          </ReferenceManyField>
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByText("page 1")).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    // Let any stray fetch settle before asserting there was none.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(manyReferenceSpy).not.toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();
  });
});
