/**
 * `<ReferenceManyCount>` shows how many rows of `reference` point at a record,
 * read from the `total` of a one-row `getManyReference` page. Mounted over a
 * seeded `fakeDataProvider` with spies on the provider and DOM assertions only.
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
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import type { ListContextValue } from "../../../form";
import { ListContextProvider } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useList } from "../../../use-list";
import { DataTable } from "../list/data-table";
import { ReferenceManyCount } from "./reference-many-count";

const books = [
  { id: 1, title: "Hello", author_id: 1, year: 2020 },
  { id: 2, title: "World", author_id: 1, year: 2022 },
  { id: 3, title: "Foo", author_id: 1, year: 2021 },
  { id: 4, title: "Other", author_id: 2, year: 2019 },
  { id: 5, title: "Another", author_id: 2, year: 2018 },
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
  };
}

const countOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="reference-many-count"]');

afterEach(cleanup);

describe("<ReferenceManyCount>", () => {
  it("renders the total of rows whose target equals the record id", async () => {
    const { Providers } = makeProviders();
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceManyCount reference="books" target="author_id" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(countOf(container)?.textContent).toBe("3");
    });
  });

  it("asks the provider for one row only", async () => {
    const { Providers, manyReferenceSpy } = makeProviders();
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <ReferenceManyCount reference="books" target="author_id" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(countOf(container)?.textContent).toBe("3");
    });
    expect(manyReferenceSpy).toHaveBeenCalledTimes(1);
    expect(manyReferenceSpy).toHaveBeenCalledWith(
      "books",
      expect.objectContaining({
        target: "author_id",
        id: 1,
        pagination: { page: 1, perPage: 1 },
      }),
    );
  });

  it("the filter prop narrows the count", async () => {
    const { Providers, manyReferenceSpy } = makeProviders();
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <ReferenceManyCount
            reference="books"
            target="author_id"
            filter={{ year: 2022 }}
          />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(countOf(container)?.textContent).toBe("1");
    });
    expect(manyReferenceSpy).toHaveBeenCalledWith(
      "books",
      expect.objectContaining({ filter: { year: 2022 } }),
    );
  });

  it("renders 0 for a record with no related rows", async () => {
    const { Providers } = makeProviders();
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 99 }}>
          <ReferenceManyCount reference="books" target="author_id" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(countOf(container)?.textContent).toBe("0");
    });
  });

  it("matches target against the source field of the record, and takes a record prop over the ambient one", async () => {
    const { Providers } = makeProviders();
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <ReferenceManyCount
            reference="books"
            target="author_id"
            source="author_key"
            record={{ id: 7, author_key: 2 }}
          />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(countOf(container)?.textContent).toBe("2");
    });
  });

  it("renders the loading node while pending and the error node when the lookup rejects", async () => {
    const { Providers, manyReferenceSpy } = makeProviders();
    let reject: (reason: Error) => void = () => {};
    manyReferenceSpy.mockImplementation(
      () =>
        new Promise((_, rej) => {
          reject = rej;
        }),
    );
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <ReferenceManyCount
            reference="books"
            target="author_id"
            loading={<i>counting</i>}
            error={<b>failed</b>}
          />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByText("counting")).toBeTruthy();
    expect(countOf(container)).toBeNull();

    reject(new Error("boom"));
    await waitFor(() => {
      expect(screen.getByText("failed")).toBeTruthy();
    });
    expect(screen.queryByText("counting")).toBeNull();
    expect(countOf(container)).toBeNull();
  });

  it("renders nothing and fetches nothing without a record id", async () => {
    const { Providers, manyReferenceSpy } = makeProviders();
    const { container } = render(
      <Providers>
        <ReferenceManyCount
          reference="books"
          target="author_id"
          loading={<i>counting</i>}
        />
      </Providers>,
    );
    // Let a stray fetch settle before asserting there was none.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container.textContent).toBe("");
    expect(manyReferenceSpy).not.toHaveBeenCalled();
  });

  it("renders nothing when the provider returns no total", async () => {
    const { Providers, manyReferenceSpy } = makeProviders();
    manyReferenceSpy.mockResolvedValue({
      data: [],
    });
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <ReferenceManyCount reference="books" target="author_id" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container.textContent).toBe("");
  });

  it("in a DataTable column counts each row on its own", async () => {
    const { Providers } = makeProviders();
    const authors = [
      { id: 1, name: "Jane" },
      { id: 2, name: "John" },
      { id: 3, name: "Nobody" },
    ];
    function AuthorTable() {
      const list = useList({ data: authors });
      return (
        <ResourceContextProvider value="authors">
          <ListContextProvider value={list as unknown as ListContextValue}>
            <DataTable>
              <DataTable.Col source="name" />
              <DataTable.Col label="Books">
                <ReferenceManyCount reference="books" target="author_id" />
              </DataTable.Col>
            </DataTable>
          </ListContextProvider>
        </ResourceContextProvider>
      );
    }
    render(
      <Providers>
        <AuthorTable />
      </Providers>,
    );
    const rowCells = (name: string) =>
      within(screen.getByText(name).closest("tr") as HTMLElement)
        .getAllByRole("cell")
        .map((cell) => cell.textContent);
    await waitFor(() => {
      expect(rowCells("Jane")).toEqual(["Jane", "3"]);
    });
    await waitFor(() => {
      expect(rowCells("John")).toEqual(["John", "2"]);
    });
    await waitFor(() => {
      expect(rowCells("Nobody")).toEqual(["Nobody", "0"]);
    });
  });
});
