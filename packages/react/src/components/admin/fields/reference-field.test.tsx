/**
 * P7d-T3 — `<ReferenceField>` ported onto chelone data hooks.
 *
 * Resolves a single referenced record (via `useGetOne`) off the FK at `source`,
 * publishes it in a `RecordContext`, and renders the child field (or the
 * reference's record representation). Optionally wraps the output in a link to
 * the referenced record's page.
 *
 * Rebridge note: chelone has no `ReferenceFieldBase`/`useReferenceFieldContext`
 * (shadmin's ra-core-derived controller stack). The field is built directly on
 * `useGetOne` + `useGetRecordRepresentation` + `RecordContextProvider`, and the
 * link uses the router adapter's `Link` + `useCreatePath`.
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
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../../admin/admin";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { ReferenceField } from "./reference-field";
import { TextField } from "./text-field";

const authors = [
  { id: 1, name: "Jane Doe" },
  { id: 2, name: "John Smith" },
];

function makeProviders() {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "No author": "No author" }) },
  });
  const dataProvider = fakeDataProvider({
    authors: structuredClone(authors),
    posts: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "authors",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: true,
    recordRepresentation: "name",
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
  return Providers;
}

function renderUnderAdmin(
  children: ReactNode,
  dataProvider = fakeDataProvider({ authors: structuredClone(authors) }),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <MemoryRouter>
      <Admin
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
        dashboard={children}
      />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("<ReferenceField>", () => {
  it("three rows over two authors make one getMany call with each id once and no getOne call", async () => {
    const dataProvider = fakeDataProvider({
      authors: structuredClone(authors),
    });
    const getMany = vi.spyOn(dataProvider, "getMany");
    const getOne = vi.spyOn(dataProvider, "getOne");
    renderUnderAdmin(
      [
        { id: 10, author_id: 1 },
        { id: 11, author_id: 2 },
        { id: 12, author_id: 1 },
      ].map((record) => (
        <RecordContextProvider key={record.id} value={record}>
          <ReferenceField source="author_id" reference="authors" link={false} />
        </RecordContextProvider>
      )),
      dataProvider,
    );
    await waitFor(() => {
      expect(screen.getAllByText("Jane Doe")).toHaveLength(2);
      expect(screen.getByText("John Smith")).toBeTruthy();
    });
    expect(getMany).toHaveBeenCalledExactlyOnceWith("authors", { ids: [1, 2] });
    expect(getOne).not.toHaveBeenCalled();
  });

  it("renders the empty node when the provider omits the id", async () => {
    const dataProvider = fakeDataProvider({
      authors: structuredClone(authors),
    });
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockResolvedValue({ data: [] });
    renderUnderAdmin(
      <ReferenceField
        source="author_id"
        reference="authors"
        record={{ author_id: 99 }}
        empty={<span>No author</span>}
        error={<span>Lookup failed</span>}
      />,
      dataProvider,
    );
    expect(await screen.findByText("No author")).toBeTruthy();
    expect(screen.queryByText("Lookup failed")).toBeNull();
    expect(getMany).toHaveBeenCalledExactlyOnceWith("authors", { ids: [99] });
  });

  it("renders the error node when the batch rejects", async () => {
    const dataProvider = fakeDataProvider({
      authors: structuredClone(authors),
    });
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockRejectedValue(new Error("Offline"));
    renderUnderAdmin(
      <ReferenceField
        source="author_id"
        reference="authors"
        record={{ author_id: 1 }}
        empty={<span>No author</span>}
        error={<span>Lookup failed</span>}
      />,
      dataProvider,
    );
    expect(await screen.findByText("Lookup failed")).toBeTruthy();
    expect(screen.queryByText("No author")).toBeNull();
    expect(getMany).toHaveBeenCalledExactlyOnceWith("authors", { ids: [1] });
  });

  it("renders the referenced record's representation once loaded", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 1 }}>
          <ReferenceField source="author_id" reference="authors" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeTruthy();
    });
  });

  it("renders a child field against the referenced record", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 2 }}>
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("John Smith")).toBeTruthy();
    });
  });

  it("wraps the value in a link when the link prop is set", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 1 }}>
          <ReferenceField source="author_id" reference="authors" link="show" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Jane Doe" });
      expect(link.getAttribute("href")).toContain("/authors/1/show");
    });
  });

  it("infers a show link when link is omitted (definition.hasShow)", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 1 }}>
          <ReferenceField source="author_id" reference="authors" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Jane Doe" });
      expect(link.getAttribute("href")).toContain("/authors/1/show");
    });
  });

  it("renders no link when link is false", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 1 }}>
          <ReferenceField source="author_id" reference="authors" link={false} />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeTruthy();
    });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links to the edit path when link='edit' is explicit", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 1 }}>
          <ReferenceField source="author_id" reference="authors" link="edit" />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Jane Doe" });
      expect(link.getAttribute("href")).toContain("/authors/1");
    });
    expect(
      screen.getByRole("link", { name: "Jane Doe" }).getAttribute("href"),
    ).not.toContain("/show");
  });

  it("renders the empty node when the FK is null", () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: null }}>
          <ReferenceField
            source="author_id"
            reference="authors"
            empty="No author"
          />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByText("No author")).toBeTruthy();
  });
});
