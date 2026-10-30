/**
 * `<ReferenceManyField>` asks the data provider's `getManyReference` for each
 * page, sort and filter, and publishes the controller as the ambient list
 * context. Mounted under a real `<Admin>` over a seeded `fakeDataProvider`, with
 * the spies on the provider and DOM assertions only.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useListContext } from "../../../list/list-context";
import {
  provideRecordContext,
  type RecordValue,
} from "../../../record/record-context";
import SortButton from "../buttons/sort-button.vue";
import DataTable from "../list/data-table.vue";
import DataTableCol from "../list/data-table-col.vue";
import ReferenceManyField from "./reference-many-field.vue";

const books = [
  { id: 1, title: "Hello", author_id: 1, year: 2020 },
  { id: 2, title: "World", author_id: 1, year: 2022 },
  { id: 3, title: "Foo", author_id: 1, year: 2021 },
  { id: 4, title: "Other", author_id: 2, year: 2019 },
  { id: 5, title: "Another", author_id: 2, year: 2018 },
  { id: 6, title: "Third", author_id: 2, year: 2017 },
];

function mountAdmin(render: () => unknown) {
  const dataProvider = fakeDataProvider({
    books: structuredClone(books),
    authors: [],
  });
  const manyReferenceSpy = vi.spyOn(dataProvider, "getManyReference");
  const listSpy = vi.spyOn(dataProvider, "getList");
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
  return { wrapper, manyReferenceSpy, listSpy };
}

/** Provides `record` as the ambient record, then renders the field around `children`. */
function withRecord(
  record: RecordValue | Ref<RecordValue>,
  props: Record<string, unknown>,
  children: () => unknown,
) {
  return defineComponent({
    setup() {
      provideRecordContext(record as never);
      return () =>
        h(
          ReferenceManyField,
          { reference: "books", target: "author_id", ...props },
          { default: children },
        );
    },
  });
}

/** Shows the list context and exposes its actions as buttons. */
const Probe = defineComponent({
  setup() {
    const list = useListContext();
    const button = (label: string, onClick: () => void) =>
      h("button", { type: "button", onClick }, label);
    return () =>
      h("div", [
        h(
          "ul",
          (list.data ?? []).map((row) =>
            h("li", String((row as { title: string }).title)),
          ),
        ),
        h("output", `page ${list.page}`),
        h("output", `selected [${list.selectedIds.join(",")}]`),
        button("go to page 2", () => list.setPage(2)),
        button("toggle 1", () => list.toggleItem(1)),
        button("toggle 3", () => list.toggleItem(3)),
        button("unselect all", () => list.unselectAll()),
        button("narrow to one", () => list.setFilters({ title: "Foo" })),
        button("narrow to none", () => list.setFilters({ title: "Hello" })),
      ]);
  },
});

const titleTable = () =>
  h(DataTable, null, { default: () => h(DataTableCol, { source: "title" }) });

describe("ReferenceManyField", () => {
  it("calls getManyReference with the target, the record id and the first page and never getList", async () => {
    const { wrapper, manyReferenceSpy, listSpy } = mountAdmin(() =>
      h(withRecord({ id: 1, name: "Jane" }, {}, () => h(Probe))),
    );
    await vi.waitFor(() => {
      expect(wrapper.findAll("li")).toHaveLength(3);
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
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(withRecord({ id: 1 }, { perPage: 2 }, titleTable)),
    );
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Hello");
    });
    expect(wrapper.text()).toContain("World");
    expect(wrapper.text()).not.toContain("Foo");

    await wrapper.get('button[aria-label="Next"]').trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Foo");
    });
    expect(wrapper.text()).not.toContain("Hello");
    expect(manyReferenceSpy).toHaveBeenLastCalledWith(
      "books",
      expect.objectContaining({ pagination: { page: 2, perPage: 2 } }),
    );
  });

  // The Vue `DataTableCol` header has no sort control yet, so the sort goes
  // through `SortButton`, the Vue sort control that calls the list `setSort`.
  it("a DataTable column header click sorts on the server", async () => {
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(
        withRecord({ id: 1 }, {}, () => [
          h(SortButton, { fields: ["title"] }),
          titleTable(),
        ]),
      ),
    );
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Hello");
    });

    await wrapper.get('[data-slot="sort-button"]').trigger("click");
    await wrapper.get('[data-field="title"]').trigger("click");

    await vi.waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenLastCalledWith(
        "books",
        expect.objectContaining({ sort: { field: "title", order: "ASC" } }),
      );
    });
    await vi.waitFor(() => {
      expect(wrapper.findAll("td").map((td) => td.text())).toEqual([
        "Foo",
        "Hello",
        "World",
      ]);
    });
  });

  it("setFilters from the list context reaches the provider and the filter prop stays applied", async () => {
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(withRecord({ id: 1 }, { filter: { year: 2021 } }, () => h(Probe))),
    );
    await vi.waitFor(() => {
      expect(wrapper.findAll("li").map((li) => li.text())).toEqual(["Foo"]);
    });

    const click = (label: string) =>
      wrapper
        .findAll("button")
        .find((b) => b.text() === label)
        ?.trigger("click");

    await click("narrow to one");
    await vi.waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenLastCalledWith(
        "books",
        expect.objectContaining({ filter: { title: "Foo", year: 2021 } }),
      );
    });
    expect(wrapper.findAll("li").map((li) => li.text())).toEqual(["Foo"]);

    // Hello is a 2020 book: the year 2021 filter prop still applies.
    await click("narrow to none");
    await vi.waitFor(() => {
      expect(manyReferenceSpy).toHaveBeenLastCalledWith(
        "books",
        expect.objectContaining({ filter: { title: "Hello", year: 2021 } }),
      );
    });
    await vi.waitFor(() => {
      expect(wrapper.findAll("li")).toHaveLength(0);
    });
  });

  it("selected rows stay selected across pages and unselectAll clears them", async () => {
    const { wrapper } = mountAdmin(() =>
      h(withRecord({ id: 1 }, { perPage: 2 }, () => h(Probe))),
    );
    await vi.waitFor(() => {
      expect(wrapper.findAll("li")).toHaveLength(2);
    });
    const click = async (label: string) => {
      await wrapper
        .findAll("button")
        .find((b) => b.text() === label)
        ?.trigger("click");
    };

    await click("toggle 1");
    expect(wrapper.text()).toContain("selected [1]");

    await click("go to page 2");
    await vi.waitFor(() => {
      expect(wrapper.findAll("li").map((li) => li.text())).toEqual(["Foo"]);
    });
    expect(wrapper.text()).toContain("selected [1]");

    await click("toggle 3");
    expect(wrapper.text()).toContain("selected [1,3]");

    await click("unselect all");
    expect(wrapper.text()).toContain("selected []");
  });

  it("renders the rows once a record that arrives late gets its id", async () => {
    const record = ref<RecordValue>(undefined);
    const { wrapper, manyReferenceSpy } = mountAdmin(() =>
      h(withRecord(record, {}, () => h(Probe))),
    );
    expect(wrapper.findAll("li")).toHaveLength(0);
    expect(manyReferenceSpy).not.toHaveBeenCalled();

    record.value = { id: 1, name: "Jane" };

    await vi.waitFor(() => {
      expect(wrapper.findAll("li")).toHaveLength(3);
    });
    expect(wrapper.text()).not.toContain("Other");
    expect(manyReferenceSpy).toHaveBeenCalledWith(
      "books",
      expect.objectContaining({ target: "author_id", id: 1 }),
    );
  });

  it("without a record id fetches nothing and renders an empty list", async () => {
    const { wrapper, manyReferenceSpy, listSpy } = mountAdmin(() =>
      h(withRecord({ name: "Draft" } as never, {}, () => h(Probe))),
    );
    expect(wrapper.text()).toContain("page 1");
    expect(wrapper.findAll("li")).toHaveLength(0);
    // Let any stray fetch settle before asserting there was none.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(manyReferenceSpy).not.toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();
  });
});
