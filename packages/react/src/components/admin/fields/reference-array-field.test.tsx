/**
 * P7d-T3 — `<ReferenceArrayField>` ported onto chelone data hooks.
 *
 * Resolves an array of FKs (via `useGetManyAggregate`) into a client-side `ListContext`
 * and renders its children. Rebridge note: chelone has no
 * `ReferenceArrayFieldBase`; the field composes `useFieldValue` + `useGetManyAggregate` +
 * `useList` + `ListContextProvider`. The default `SingleFieldList` child does
 * not exist yet (WAVE D), so children are supplied by the caller.
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
import { Admin } from "../../../admin/admin";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
import { ReferenceArrayField } from "./reference-array-field";
import { ReferenceField } from "./reference-field";

const tags = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];

function makeProviders() {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  const dataProvider = fakeDataProvider({
    tags: structuredClone(tags),
    posts: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "tags",
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

interface Row {
  id: number;
  name: string;
}

function TagList() {
  const { data = [] } = useListContext();
  return (
    <ul>
      {(data as Row[]).map((t) => (
        <li key={t.id}>{t.name}</li>
      ))}
    </ul>
  );
}

function renderUnderAdmin(
  children: ReactNode,
  dataProvider = fakeDataProvider({ tags: structuredClone(tags) }),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Providers({ children }: { children: ReactNode }) {
    return (
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
      </MemoryRouter>
    );
  }
  return render(children, { wrapper: Providers });
}

function ListStatus() {
  const { error, isPending } = useListContext();
  if (error) return <p role="alert">Lookup failed</p>;
  if (isPending) return <p role="status">Loading</p>;
  return <TagList />;
}

afterEach(cleanup);

describe("<ReferenceArrayField>", () => {
  it("two fields with overlapping ids make one getMany call and each lists only its own records", async () => {
    const dataProvider = fakeDataProvider({ tags: structuredClone(tags) });
    const getMany = vi.spyOn(dataProvider, "getMany");
    renderUnderAdmin(
      <>
        <section aria-label="First tags">
          <ReferenceArrayField
            source="tag_ids"
            reference="tags"
            record={{ id: 1, tag_ids: [1, 2] }}
          >
            <TagList />
          </ReferenceArrayField>
        </section>
        <section aria-label="Second tags">
          <ReferenceArrayField
            source="tag_ids"
            reference="tags"
            record={{ id: 1, tag_ids: [2, 3] }}
          >
            <TagList />
          </ReferenceArrayField>
        </section>
      </>,
      dataProvider,
    );
    await waitFor(() => {
      expect(
        within(screen.getByRole("region", { name: "First tags" }))
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Tech", "News"]);
      expect(
        within(screen.getByRole("region", { name: "Second tags" }))
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["News", "Lifestyle"]);
    });
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: expect.arrayContaining([1, 2, 3]) }),
    );
    expect(getMany.mock.calls[0]?.[1].ids).toHaveLength(3);
  });

  it("shares batches across sources and scalar fields while isolating resources", async () => {
    const dataProvider = fakeDataProvider({
      tags: structuredClone(tags),
      authors: [{ id: 1, name: "Jane Doe" }],
    });
    const getMany = vi.spyOn(dataProvider, "getMany");
    const getOne = vi.spyOn(dataProvider, "getOne");
    renderUnderAdmin(
      <>
        <section aria-label="Primary tags">
          <ReferenceArrayField
            source="tag_ids"
            reference="tags"
            record={{ id: 1, tag_ids: [1, 1, 2] }}
          >
            <ListStatus />
          </ReferenceArrayField>
        </section>
        <section aria-label="Other tags">
          <ReferenceArrayField
            source="other_tag_ids"
            reference="tags"
            record={{ id: 1, other_tag_ids: [2, 3] }}
          >
            <TagList />
          </ReferenceArrayField>
        </section>
        <section aria-label="Single tag">
          <ReferenceField
            source="tag_id"
            reference="tags"
            record={{ id: 1, tag_id: 3 }}
            link={false}
          />
        </section>
        <section aria-label="Authors">
          <ReferenceArrayField
            source="author_ids"
            reference="authors"
            record={{ id: 1, author_ids: [1] }}
          >
            <TagList />
          </ReferenceArrayField>
        </section>
      </>,
      dataProvider,
    );
    await waitFor(() => {
      expect(
        within(screen.getByRole("region", { name: "Primary tags" }))
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Tech", "News"]);
      expect(
        within(screen.getByRole("region", { name: "Other tags" }))
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["News", "Lifestyle"]);
      expect(
        screen.getByRole("region", { name: "Single tag" }).textContent,
      ).toBe("Lifestyle");
      expect(
        within(screen.getByRole("region", { name: "Authors" }))
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Jane Doe"]);
    });
    expect(getMany).toHaveBeenCalledTimes(2);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: expect.arrayContaining([1, 2, 3]) }),
    );
    expect(
      getMany.mock.calls.find(([resource]) => resource === "tags")?.[1].ids,
    ).toHaveLength(3);
    expect(getMany).toHaveBeenCalledWith(
      "authors",
      expect.objectContaining({ ids: [1] }),
    );
    expect(getOne).not.toHaveBeenCalled();
  });

  it.each([
    { label: "missing", record: { id: 1 } },
    { label: "undefined", record: { id: 1, tag_ids: undefined } },
    { label: "null", record: { id: 1, tag_ids: null } },
    { label: "empty", record: { id: 1, tag_ids: [] } },
    { label: "string", record: { id: 1, tag_ids: "invalid" } },
    { label: "object", record: { id: 1, tag_ids: {} } },
  ])("does not fetch a $label FK array", async ({ record }) => {
    const dataProvider = fakeDataProvider({ tags: structuredClone(tags) });
    const getMany = vi.spyOn(dataProvider, "getMany");
    renderUnderAdmin(
      <>
        <section aria-label="Empty tags">
          <ReferenceArrayField
            source="tag_ids"
            reference="tags"
            record={record}
          >
            <ListStatus />
          </ReferenceArrayField>
        </section>
        <ReferenceField
          source="tag_id"
          reference="tags"
          record={{ id: 1, tag_id: 3 }}
          link={false}
        />
      </>,
      dataProvider,
    );
    // The sibling's result proves the aggregate batch has flushed.
    await screen.findByText("Lifestyle");
    const field = within(screen.getByRole("region", { name: "Empty tags" }));
    expect(field.getByRole("list")).toBeDefined();
    expect(field.queryByRole("listitem")).toBeNull();
    expect(field.queryByRole("status")).toBeNull();
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: [3] }),
    );
  });

  it("exposes a rejected batch and clears its error when the FK array becomes empty", async () => {
    const dataProvider = fakeDataProvider({ tags: structuredClone(tags) });
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockRejectedValue(new Error("Offline"));
    const view = renderUnderAdmin(
      <ReferenceArrayField
        source="tag_ids"
        reference="tags"
        record={{ id: 1, tag_ids: [1] }}
      >
        <ListStatus />
      </ReferenceArrayField>,
      dataProvider,
    );
    expect(screen.getByRole("status").textContent).toBe("Loading");
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Lookup failed",
    );
    view.rerender(
      <ReferenceArrayField
        source="tag_ids"
        reference="tags"
        record={{ id: 1, tag_ids: [] }}
      >
        <ListStatus />
      </ReferenceArrayField>,
    );
    await waitFor(() => {
      expect(screen.getByRole("list")).toBeDefined();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.queryByRole("listitem")).toBeNull();
    });
    expect(getMany).toHaveBeenCalledTimes(1);
  });

  it("lists only records returned for its requested ids", async () => {
    const dataProvider = fakeDataProvider({ tags: structuredClone(tags) });
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockResolvedValue({ data: [{ id: 1, name: "Tech" }] });
    renderUnderAdmin(
      <ReferenceArrayField
        source="tag_ids"
        reference="tags"
        record={{ id: 1, tag_ids: [1, 99] }}
      >
        <ListStatus />
      </ReferenceArrayField>,
      dataProvider,
    );
    await waitFor(() =>
      expect(
        screen.getAllByRole("listitem").map((item) => item.textContent),
      ).toEqual(["Tech"]),
    );
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: expect.arrayContaining([1, 99]) }),
    );
    expect(getMany.mock.calls[0]?.[1].ids).toHaveLength(2);
  });

  it("keeps the valid ids of a partially valid FK array", async () => {
    const dataProvider = fakeDataProvider({ tags: structuredClone(tags) });
    const getMany = vi.spyOn(dataProvider, "getMany");
    renderUnderAdmin(
      <ReferenceArrayField
        source="tag_ids"
        reference="tags"
        record={{ id: 1, tag_ids: [1, null, 2] }}
      >
        <ListStatus />
      </ReferenceArrayField>,
      dataProvider,
    );
    await waitFor(() =>
      expect(
        screen.getAllByRole("listitem").map((item) => item.textContent),
      ).toEqual(["Tech", "News"]),
    );
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: [1, 2] }),
    );
  });

  it("resolves the array of FKs and lists the referenced records", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, tag_ids: [1, 3] }}>
          <ReferenceArrayField source="tag_ids" reference="tags">
            <TagList />
          </ReferenceArrayField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Tech")).toBeTruthy();
      expect(screen.getByText("Lifestyle")).toBeTruthy();
    });
    expect(screen.queryByText("News")).toBeNull();
  });

  it("publishes an empty list when the FK array is empty", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 10, tag_ids: [] }}>
          <ReferenceArrayField source="tag_ids" reference="tags">
            <TagList />
          </ReferenceArrayField>
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
