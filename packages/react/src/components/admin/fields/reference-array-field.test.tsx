/**
 * P7d-T3 — `<ReferenceArrayField>` ported onto chelone data hooks.
 *
 * Resolves an array of FKs (via `useGetMany`) into a client-side `ListContext`
 * and renders its children. Rebridge note: chelone has no
 * `ReferenceArrayFieldBase`; the field composes `useFieldValue` + `useGetMany` +
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
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../../admin/admin";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
import { ReferenceArrayField } from "./reference-array-field";

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

afterEach(cleanup);

describe("<ReferenceArrayField>", () => {
  it("two fields with overlapping ids make one getMany call and each lists only its own records", async () => {
    const dataProvider = fakeDataProvider({ tags: structuredClone(tags) });
    const getMany = vi.spyOn(dataProvider, "getMany");
    render(
      <MemoryRouter>
        <Admin
          dataProvider={dataProvider}
          queryClient={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
          i18n={createI18n({
            locale: "en",
            messages: { en: defineMessages({}) },
          })}
          dashboard={
            <>
              <ReferenceArrayField
                source="tag_ids"
                reference="tags"
                record={{ tag_ids: [1, 2] }}
              >
                <TagList />
              </ReferenceArrayField>
              <ReferenceArrayField
                source="tag_ids"
                reference="tags"
                record={{ tag_ids: [2, 3] }}
              >
                <TagList />
              </ReferenceArrayField>
            </>
          }
        />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen
          .getAllByRole("list")
          .map((list) =>
            Array.from(list.querySelectorAll("li"), (item) => item.textContent),
          ),
      ).toEqual([
        ["Tech", "News"],
        ["News", "Lifestyle"],
      ]);
    });
    expect(getMany).toHaveBeenCalledExactlyOnceWith("tags", { ids: [1, 2, 3] });
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
