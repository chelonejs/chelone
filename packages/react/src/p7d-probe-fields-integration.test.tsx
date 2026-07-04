/**
 * P7d integration probe — prove the ported display fields render record data
 * end-to-end through the real provider stack (Chelone + resource registry +
 * router + fakeDataProvider), not just per-field in isolation.
 *
 * (a) a mixed set of common fields inside ONE RecordContextProvider render
 *     their record's values (text / number / boolean / date / email / url /
 *     chip);
 * (b) a ReferenceField against fakeDataProvider resolves the referenced record
 *     and renders a child representation (mutation-verified non-vacuous);
 * (c) an ArrayField iterates an array-valued source, rendering per row;
 * (d) empty / null source renders gracefully — no crash, empty text.
 *
 * Rebridge note: same seam as the inputs — fields read the ambient record via
 * useFieldValue/useRecordContext; ReferenceField resolves through useGetOne on
 * the shared dataProvider. This probe wires the whole graph together the way an
 * app would.
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
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "./context";
import { useListContext } from "./form";
import {
  ArrayField,
  BooleanField,
  ChipField,
  DateField,
  EmailField,
  NumberField,
  ReferenceField,
  TextField,
  UrlField,
} from "./index";
import { RecordContextProvider } from "./record/record-context";
import { ResourceRegistryProvider } from "./resource";
import { RouterAdapterProvider } from "./router/adapter";
import { reactRouterAdapter } from "./router/react-router-adapter";

afterEach(cleanup);

const AUTHORS = [
  { id: 1, name: "Ada Lovelace" },
  { id: 2, name: "Alan Turing" },
];

function makeProviders(
  dataProvider = fakeDataProvider({ authors: [], posts: [] }),
) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "Nothing here" }) },
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
  return function Providers({ children }: { children: ReactNode }) {
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
  };
}

/** Consumer that renders each ArrayField row so we can assert per-row output. */
interface TagRow {
  id: string;
}
function TagList() {
  const { data = [] } = useListContext();
  return (
    <ul>
      {(data as TagRow[]).map((row) => (
        <li key={row.id} aria-label={row.id}>
          {row.id}
        </li>
      ))}
    </ul>
  );
}

describe("P7d fields integration probe", () => {
  // (a) common fields render their record values inside one RecordContext.
  it("renders a mixed field set against one shared record", () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 7,
            title: "War and Peace",
            views: 1234567,
            published: true,
            // date-only ISO → forced UTC → stable label regardless of runner TZ
            published_at: "2022-02-15",
            author_email: "ada@example.com",
            homepage: "https://example.com",
            category: "Fiction",
          }}
        >
          <TextField source="title" />
          <NumberField source="views" locales="en-US" />
          <BooleanField source="published" />
          <DateField source="published_at" locales="en-US" />
          <EmailField source="author_email" />
          <UrlField source="homepage" />
          <ChipField source="category" />
        </RecordContextProvider>
      </Providers>,
    );

    // text
    expect(screen.getByText("War and Peace")).toBeTruthy();
    // number — locale-grouped
    expect(screen.getByText("1,234,567")).toBeTruthy();
    // boolean — renders an svg icon for the truthy branch
    expect(document.querySelector("svg")).toBeTruthy();
    // date — locale-formatted
    expect(screen.getByText("2/15/2022")).toBeTruthy();
    // email — mailto anchor
    const mail = screen.getByText("ada@example.com");
    expect(mail.getAttribute("href")).toBe("mailto:ada@example.com");
    // url — anchor to the value
    const url = screen.getByText("https://example.com");
    expect(url.getAttribute("href")).toBe("https://example.com");
    // chip
    expect(screen.getByText("Fiction")).toBeTruthy();
  });

  // (b) reference-field resolves the referenced record off the dataProvider and
  //     renders a child field against it.
  it("resolves a ReferenceField against fakeDataProvider and renders a child", async () => {
    const dataProvider = fakeDataProvider({
      authors: structuredClone(AUTHORS),
      posts: [],
    });
    const Providers = makeProviders(dataProvider);
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 1 }}>
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    });
    // the OTHER author must NOT be what got resolved — guards against a
    // hard-coded / first-record render.
    expect(screen.queryByText("Alan Turing")).toBeNull();
  });

  // Mutation-verify non-vacuity: the resolved name must track the FK. If the
  // field ignored the referenced record (rendered a constant), one of these two
  // asserts would fail.
  it("ReferenceField resolution tracks the FK (non-vacuity check)", async () => {
    const dataProvider = fakeDataProvider({
      authors: structuredClone(AUTHORS),
      posts: [],
    });
    const Providers = makeProviders(dataProvider);
    const { rerender } = render(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 2 }}>
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Alan Turing")).toBeTruthy();
    });
    expect(screen.queryByText("Ada Lovelace")).toBeNull();

    // Flip the FK to author 1 within the same provider graph → resolved name
    // must flip too.
    rerender(
      <Providers>
        <RecordContextProvider value={{ id: 10, author_id: 1 }}>
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    });
  });

  // (c) array-field iterates an array-valued source, one row per element.
  it("ArrayField iterates an array-valued source per row", () => {
    const rows = [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }];
    render(
      <RecordContextProvider value={{ id: 1, tags: rows }}>
        <ArrayField source="tags">
          <TagList />
        </ArrayField>
      </RecordContextProvider>,
    );
    expect(screen.getByRole("list")).toBeTruthy();
    for (const row of rows) {
      expect(screen.getByRole("listitem", { name: row.id }).textContent).toBe(
        row.id,
      );
    }
  });

  // (d) empty / null sources render gracefully across the field set.
  it("renders empty/null sources gracefully without crashing", () => {
    const Providers = makeProviders();
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 3 }}>
          {/* no `empty` prop → nothing rendered, no throw */}
          <TextField source="title" />
          <NumberField source="views" />
          <DateField source="published_at" />
          <EmailField source="author_email" />
          <UrlField source="homepage" />
          {/* explicit null FK with an empty node */}
          <ReferenceField
            source="author_id"
            reference="authors"
            empty="myapp.empty"
          />
          {/* array source absent → empty list, no rows */}
          <ArrayField source="tags">
            <TagList />
          </ArrayField>
        </RecordContextProvider>
      </Providers>,
    );
    // no crash; the nullish text/number/date/email/url fields emit nothing, the
    // empty ReferenceField shows its placeholder, the ArrayField an empty list.
    expect(screen.getByText("Nothing here")).toBeTruthy();
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
    // the non-empty-prop fields contributed no text.
    expect(container.textContent).toBe("Nothing here");
  });
});
