/**
 * `<ReferenceManyCount>` shows how many rows of `reference` point at a record,
 * read from the `total` of a one-row `getManyReference` page. Mounted under a
 * real `<Admin>` over a seeded `fakeDataProvider`, with the spy on the provider
 * and DOM assertions only.
 */

import { type DataProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type Ref, ref, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { provideListContext } from "../../../list/list-context";
import { useList } from "../../../list/use-list";
import {
  provideRecordContext,
  type RecordValue,
} from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import DataTable from "../list/data-table.vue";
import DataTableCol from "../list/data-table-col.vue";
import ReferenceManyCount, {
  type ReferenceManyCountProps,
} from "./reference-many-count.vue";

const books = [
  { id: 1, title: "Hello", author_id: 1, year: 2020 },
  { id: 2, title: "World", author_id: 1, year: 2022 },
  { id: 3, title: "Foo", author_id: 1, year: 2021 },
  { id: 4, title: "Other", author_id: 2, year: 2019 },
  { id: 5, title: "Another", author_id: 2, year: 2018 },
];

const spyOnManyReference = (dataProvider: DataProvider) =>
  vi.spyOn(dataProvider, "getManyReference");

function mountAdmin(
  render: () => VNodeChild,
  // Runs before mount, so a stubbed provider answers the first fetch.
  stub?: (spy: ReturnType<typeof spyOnManyReference>) => void,
) {
  const dataProvider = fakeDataProvider({
    books: structuredClone(books),
    authors: [],
  });
  const manyReferenceSpy = spyOnManyReference(dataProvider);
  stub?.(manyReferenceSpy);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      // An empty layout node keeps the default chrome out of `text()`.
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          { default: render, layout: () => h("div") },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, manyReferenceSpy };
}

/** Provides `record` as the ambient record, then renders the count. */
function withRecord(
  record: RecordValue | Ref<RecordValue>,
  props: Partial<ReferenceManyCountProps> = {},
) {
  return defineComponent({
    setup() {
      provideRecordContext(record);
      return () =>
        h(ReferenceManyCount, {
          reference: "books",
          target: "author_id",
          ...props,
        });
    },
  });
}

const countOf = (wrapper: ReturnType<typeof mountAdmin>["wrapper"]) =>
  wrapper.find('[data-slot="reference-many-count"]');

describe("ReferenceManyCount", () => {
  it("renders the total of rows whose target equals the record id", async () => {
    const { wrapper } = mountAdmin(() =>
      h(withRecord({ id: 1, name: "Jane" })),
    );
    await vi.waitFor(() => {
      expect(countOf(wrapper).text()).toBe("3");
    });
  });

  it("asks the provider for one row only", async () => {
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(withRecord({ id: 1 })),
    );
    await vi.waitFor(() => {
      expect(countOf(wrapper).exists()).toBe(true);
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
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(withRecord({ id: 1 }, { filter: { year: 2022 } })),
    );
    await vi.waitFor(() => {
      expect(countOf(wrapper).text()).toBe("1");
    });
    expect(manyReferenceSpy).toHaveBeenCalledWith(
      "books",
      expect.objectContaining({ filter: { year: 2022 } }),
    );
  });

  it("renders 0 for a record with no related rows", async () => {
    const { wrapper } = mountAdmin(() => h(withRecord({ id: 99 })));
    await vi.waitFor(() => {
      expect(countOf(wrapper).text()).toBe("0");
    });
  });

  it("matches target against the source field of the record prop over the ambient record", async () => {
    const props = { source: "author_key", record: { id: 7, author_key: 2 } };
    const { wrapper } = mountAdmin(() => h(withRecord({ id: 1 }, props)));
    await vi.waitFor(() => {
      expect(countOf(wrapper).text()).toBe("2");
    });
  });

  it("picks up an ambient record that arrives late", async () => {
    const record = ref<RecordValue>(undefined);
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(withRecord(record)),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(manyReferenceSpy).not.toHaveBeenCalled();

    record.value = { id: 2 };
    await vi.waitFor(() => {
      expect(countOf(wrapper).text()).toBe("2");
    });
  });

  it("renders the loading text while pending and the error text when the lookup rejects", async () => {
    let reject: (reason: Error) => void = () => {};
    const pending = new Promise<never>((_, rej) => {
      reject = rej;
    });
    const { wrapper } = mountAdmin(
      () => h(withRecord({ id: 1 }, { loading: "counting", error: "failed" })),
      (spy) => spy.mockReturnValue(pending),
    );
    expect(wrapper.text()).toBe("counting");
    expect(countOf(wrapper).exists()).toBe(false);

    reject(new Error("boom"));
    await vi.waitFor(() => {
      expect(wrapper.text()).toBe("failed");
    });
    expect(countOf(wrapper).exists()).toBe(false);
  });

  it("renders nothing and fetches nothing without a record id", async () => {
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(ReferenceManyCount, {
        reference: "books",
        target: "author_id",
        loading: "counting",
      }),
    );
    // Let a stray fetch settle before asserting there was none.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.text()).toBe("");
    expect(manyReferenceSpy).not.toHaveBeenCalled();
  });

  it("renders nothing when the provider returns no total", async () => {
    const { wrapper, manyReferenceSpy } = mountAdmin(
      () => h(withRecord({ id: 1 }, { loading: "counting" })),
      (spy) => spy.mockResolvedValue({ data: [] }),
    );
    await vi.waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.text()).toBe("");
    expect(countOf(wrapper).exists()).toBe(false);
  });

  it("in a DataTable column counts each row on its own", async () => {
    const authors = [
      { id: 1, name: "Jane" },
      { id: 2, name: "John" },
      { id: 3, name: "Nobody" },
    ];
    const AuthorTable = defineComponent({
      setup() {
        provideResourceContext("authors");
        provideListContext(useList({ data: authors }));
        return () =>
          h(DataTable, null, {
            default: () => [
              h(DataTableCol, { source: "name" }),
              h(
                DataTableCol,
                { label: "Books" },
                {
                  default: () =>
                    h(ReferenceManyCount, {
                      reference: "books",
                      target: "author_id",
                    }),
                },
              ),
            ],
          });
      },
    });
    const { wrapper } = mountAdmin(() => h(AuthorTable));
    const rowCells = (name: string) =>
      wrapper
        .findAll("tr")
        .find((row) => row.text().includes(name))
        ?.findAll("td")
        .map((cell) => cell.text());
    await vi.waitFor(() => {
      expect(rowCells("Jane")).toEqual(["Jane", "3"]);
    });
    await vi.waitFor(() => {
      expect(rowCells("John")).toEqual(["John", "2"]);
    });
    await vi.waitFor(() => {
      expect(rowCells("Nobody")).toEqual(["Nobody", "0"]);
    });
  });
});
