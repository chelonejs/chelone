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
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
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
