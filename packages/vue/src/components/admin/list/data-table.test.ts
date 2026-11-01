/**
 * `<DataTableCol>` sorting, label, class and slot options, and
 * `<DataTableNumberCol>`, mounted under a real `<Admin>` + `<List>`.
 */

import {
  type AnyCheloneI18n,
  type CheloneStore,
  createI18n,
  createStore,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import {
  type ListContextValue,
  useListContext,
} from "../../../list/list-context";
import { useDataTableColumns } from "../../../list/use-data-table-columns";
import List from "../view/list.vue";
import DataTable from "./data-table.vue";
import DataTableCol from "./data-table-col.vue";
import DataTableNumberCol from "./data-table-number-col.vue";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});

const seed = [
  { id: 1, title: "alpha", views: 1234.5 },
  { id: 2, title: "beta", views: 10 },
];

const memoryRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });

type Capture = { list?: ListContextValue };

function mountTable(
  columns: () => unknown[],
  options: {
    i18n?: AnyCheloneI18n;
    store?: CheloneStore;
    tableProps?: () => Record<string, unknown>;
    tableSlots?: Record<string, () => unknown>;
  } = {},
) {
  const capture: Capture = {};
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = memoryRouter();
  const probe = defineComponent({
    setup() {
      capture.list = useListContext();
      return () => null;
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider,
            queryClient,
            i18n: options.i18n,
            store: options.store,
          },
          {
            default: () =>
              h(
                List,
                { resource: "posts" },
                {
                  default: () => [
                    h(probe),
                    h(DataTable, options.tableProps?.() ?? null, {
                      default: () => columns(),
                      ...options.tableSlots,
                    }),
                  ],
                },
              ),
          },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  const settled = () =>
    vi.waitFor(() => expect(capture.list?.isPending).toBe(false));
  return { wrapper, capture, settled };
}

describe("<DataTableCol> header sorting", () => {
  it("clicking a sortable header sorts ascending first", async () => {
    const { wrapper, capture, settled } = mountTable(() => [
      h(DataTableCol, { source: "title" }),
    ]);
    await settled();

    await wrapper.find('button[data-field="title"]').trigger("click");

    expect(capture.list?.sort[0]).toEqual({ field: "title", order: "ASC" });
    expect(wrapper.find("th[aria-sort]").attributes("aria-sort")).toBe(
      "ascending",
    );
  });

  it("clicking the sorted header flips its order", async () => {
    const { wrapper, capture, settled } = mountTable(() => [
      h(DataTableCol, { source: "title" }),
    ]);
    await settled();
    const button = wrapper.find('button[data-field="title"]');

    await button.trigger("click");
    await button.trigger("click");

    expect(capture.list?.sort[0]).toEqual({ field: "title", order: "DESC" });
    expect(wrapper.find("th[aria-sort]").attributes("aria-sort")).toBe(
      "descending",
    );
  });

  it("sortByOrder DESC makes the first click sort descending", async () => {
    const { wrapper, capture, settled } = mountTable(() => [
      h(DataTableCol, { source: "views", sortByOrder: "DESC" }),
    ]);
    await settled();

    await wrapper.find('button[data-field="views"]').trigger("click");

    expect(capture.list?.sort[0]).toEqual({ field: "views", order: "DESC" });
  });

  it("a disableSort column and a column without source render no sort button", async () => {
    const { wrapper, settled } = mountTable(() => [
      h(DataTableCol, { source: "title", disableSort: true }),
      h(DataTableCol, { label: "Actions" }, { default: () => "x" }),
    ]);
    await settled();

    expect(wrapper.find("th button").exists()).toBe(false);
    expect(wrapper.find("th[aria-sort]").exists()).toBe(false);
    expect(wrapper.text()).toContain("Title");
    expect(wrapper.text()).toContain("Actions");
  });

  it("the header shows the translated field label", async () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { "resources.posts.fields.title": "Post Title" } },
    });
    const { wrapper, settled } = mountTable(
      () => [h(DataTableCol, { source: "title" })],
      { i18n },
    );
    await settled();

    expect(wrapper.find("th").text()).toBe("Post Title");
  });
});

describe("<DataTableCol> cells", () => {
  it("cellClass, headerClass and conditionalClass reach their cells", async () => {
    const { wrapper, settled } = mountTable(() => [
      h(DataTableCol, {
        source: "title",
        headerClass: "head-x",
        cellClass: "cell-x",
        conditionalClass: (record: { id?: unknown }) =>
          record.id === 1 ? "first-x" : undefined,
      }),
    ]);
    await settled();

    expect(wrapper.find("th").classes()).toContain("head-x");
    const cells = wrapper.findAll("td");
    expect(cells).toHaveLength(2);
    for (const cell of cells) expect(cell.classes()).toContain("cell-x");
    expect(cells[0]?.classes()).toContain("first-x");
    expect(cells[1]?.classes()).not.toContain("first-x");
  });

  it("the default slot receives the row record", async () => {
    const { wrapper, settled } = mountTable(() => [
      h(
        DataTableCol,
        { label: "Shout" },
        {
          default: ({ record }: { record: { title: string } }) =>
            record.title.toUpperCase(),
        },
      ),
    ]);
    await settled();

    const cells = wrapper.findAll("td").map((c) => c.text());
    expect(cells).toEqual(["ALPHA", "BETA"]);
  });
});

describe("<DataTableNumberCol>", () => {
  it("formats a number and right-aligns its cell", async () => {
    const { wrapper, settled } = mountTable(() => [
      h(DataTableNumberCol, {
        source: "views",
        locales: "en-US",
        options: { style: "currency", currency: "USD" },
      }),
    ]);
    await settled();

    const cell = wrapper.find("td");
    expect(cell.text()).toBe("$1,234.50");
    expect(cell.classes()).toContain("text-right");
    expect(wrapper.find("th").classes()).toContain("text-right");
  });
});

const headerTexts = (wrapper: ReturnType<typeof mountTable>["wrapper"]) =>
  wrapper.findAll("th").map((th) => th.text());
const firstRowTexts = (wrapper: ReturnType<typeof mountTable>["wrapper"]) =>
  wrapper
    .findAll("tbody tr")[0]
    ?.findAll("td")
    .map((td) => td.text());

const threeColumns = () => [
  h(DataTableCol, { source: "id" }),
  h(DataTableCol, { source: "title" }),
  h(DataTableCol, { source: "views" }),
];

describe("<DataTable> columns", () => {
  it("hides the columns whose ids are in the store", async () => {
    const store = createStore();
    store.setItem("posts.datatable", ["title"]);
    const { wrapper, settled } = mountTable(threeColumns, { store });
    await settled();

    expect(headerTexts(wrapper)).toEqual(["Id", "Views"]);
    expect(firstRowTexts(wrapper)).toEqual(["1", "1234.5"]);

    store.setItem("posts.datatable", ["id"]);
    await nextTick();

    expect(headerTexts(wrapper)).toEqual(["Title", "Views"]);
    expect(firstRowTexts(wrapper)).toEqual(["alpha", "1234.5"]);
  });

  it("shows defaultHiddenColumns until a choice is stored", async () => {
    const store = createStore();
    const { wrapper, settled } = mountTable(threeColumns, {
      store,
      tableProps: () => ({ defaultHiddenColumns: ["views"] }),
    });
    await settled();

    expect(headerTexts(wrapper)).toEqual(["Id", "Title"]);

    store.setItem("posts.datatable", []);
    await nextTick();

    expect(headerTexts(wrapper)).toEqual(["Id", "Title", "Views"]);
  });

  it("renders the columns in the stored order in the header and in every row", async () => {
    const store = createStore();
    store.setItem("posts.datatable_columnOrder", ["views", "id"]);
    const { wrapper, settled } = mountTable(threeColumns, { store });
    await settled();

    expect(headerTexts(wrapper)).toEqual(["Views", "Id", "Title"]);
    for (const row of wrapper.findAll("tbody tr")) {
      expect(row.findAll("td")).toHaveLength(3);
    }
    expect(firstRowTexts(wrapper)).toEqual(["1234.5", "1", "alpha"]);
  });

  it("keeps a column with no id in place and always visible", async () => {
    const store = createStore();
    store.setItem("posts.datatable", ["title"]);
    store.setItem("posts.datatable_columnOrder", ["views", "title", "id"]);
    const { wrapper, settled } = mountTable(
      () => [
        h(DataTableCol, { source: "id" }),
        h(DataTableCol, {}, { default: () => "anon" }),
        h(DataTableCol, { source: "title" }),
        h(DataTableCol, { source: "views" }),
      ],
      { store },
    );
    await settled();

    expect(firstRowTexts(wrapper)).toEqual(["1234.5", "anon", "1"]);
  });

  it("reads columns produced by v-for and skips v-if comments", async () => {
    const store = createStore();
    store.setItem("posts.datatable", ["title"]);
    const { wrapper, settled } = mountTable(
      () => [
        ["id", "title", "views"].map((source) =>
          h(DataTableCol, { source, key: source }),
        ),
        null,
        false,
      ],
      { store },
    );
    await settled();

    expect(headerTexts(wrapper)).toEqual(["Id", "Views"]);
  });

  it("publishes its columns once and again when a column is added", async () => {
    const store = createStore();
    const setItem = vi.spyOn(store, "setItem");
    const extra = ref(false);
    const { settled } = mountTable(
      () => [
        h(DataTableCol, { source: "id" }),
        h(DataTableCol, { label: "Actions" }),
        ...(extra.value ? [h(DataTableCol, { source: "title" })] : []),
      ],
      { store, tableProps: () => ({ defaultHiddenColumns: ["Actions"] }) },
    );
    await settled();

    const columnWrites = () =>
      setItem.mock.calls.filter(([key]) => key === "posts.datatable_columns");
    expect(columnWrites()).toHaveLength(1);
    expect(store.getItem("posts.datatable_columns")).toEqual([
      { id: "id", source: "id", defaultHidden: false },
      { id: "Actions", label: "Actions", defaultHidden: true },
    ]);

    extra.value = true;
    await nextTick();
    await nextTick();

    expect(columnWrites()).toHaveLength(2);
    expect(store.getItem("posts.datatable_columns")).toHaveLength(3);
  });

  it("renders every column and writes nothing when no store is provided", async () => {
    const { wrapper, settled } = mountTable(threeColumns);
    await settled();

    expect(headerTexts(wrapper)).toEqual(["Id", "Title", "Views"]);
    expect(firstRowTexts(wrapper)).toEqual(["1", "alpha", "1234.5"]);
  });

  it("reads and writes the keys of the storeKey prop", async () => {
    const store = createStore();
    store.setItem("custom", ["id"]);
    store.setItem("custom_columnOrder", ["views"]);
    const { wrapper, settled } = mountTable(threeColumns, {
      store,
      tableProps: () => ({ storeKey: "custom" }),
    });
    await settled();

    expect(headerTexts(wrapper)).toEqual(["Views", "Title"]);
    expect(store.getItem("custom_columns")).toHaveLength(3);
    expect(store.getItem("posts.datatable_columns")).toBeUndefined();
  });

  it("follows a storeKey that changes while mounted", async () => {
    const store = createStore();
    store.setItem("a", ["id"]);
    store.setItem("b", ["views"]);
    const key = ref("a");
    const { wrapper, settled } = mountTable(threeColumns, {
      store,
      tableProps: () => ({ storeKey: key.value }),
    });
    await settled();
    expect(headerTexts(wrapper)).toEqual(["Title", "Views"]);

    key.value = "b";
    await vi.waitFor(() =>
      expect(headerTexts(wrapper)).toEqual(["Id", "Title"]),
    );

    expect(store.getItem("b_columns")).toHaveLength(3);
    store.setItem("b", ["title"]);
    await vi.waitFor(() =>
      expect(headerTexts(wrapper)).toEqual(["Id", "Views"]),
    );
  });

  it("follows defaultHiddenColumns that change while mounted", async () => {
    const store = createStore();
    const defaults = ref(["views"]);
    const { wrapper, settled } = mountTable(threeColumns, {
      store,
      tableProps: () => ({ defaultHiddenColumns: defaults.value }),
    });
    await settled();
    expect(headerTexts(wrapper)).toEqual(["Id", "Title"]);

    defaults.value = ["title"];
    await vi.waitFor(() =>
      expect(headerTexts(wrapper)).toEqual(["Id", "Views"]),
    );

    await vi.waitFor(() =>
      expect(store.getItem("posts.datatable_columns")).toEqual([
        { id: "id", source: "id", defaultHidden: false },
        { id: "title", source: "title", defaultHidden: true },
        { id: "views", source: "views", defaultHidden: false },
      ]),
    );
  });

  it("sizes the expand panel to the visible columns", async () => {
    const store = createStore();
    store.setItem("posts.datatable", ["title"]);
    const { wrapper, settled } = mountTable(threeColumns, {
      store,
      tableProps: () => ({ rowClick: "expand" }),
      tableSlots: { expand: () => "details" },
    });
    await settled();

    await wrapper.findAll("tbody tr")[0]?.trigger("click");

    // 2 visible columns + the expand toggle column
    expect(
      wrapper
        .find('[data-slot="data-table-expand-panel"] td')
        .attributes("colspan"),
    ).toBe("3");
  });
});

describe("useDataTableColumns", () => {
  function mountHook(
    store: CheloneStore,
    options: { defaultHiddenColumns?: string[] } = {},
  ) {
    let hook: ReturnType<typeof useDataTableColumns> | undefined;
    const probe = defineComponent({
      setup() {
        hook = useDataTableColumns({ storeKey: "t", ...options });
        return () => null;
      },
    });
    const dataProvider = fakeDataProvider<typeof resources>({
      posts: structuredClone(seed),
    });
    mount(Admin, {
      props: { dataProvider, store },
      slots: { default: () => h(probe) },
      global: { plugins: [memoryRouter()] },
    });
    if (!hook) throw new Error("hook not set up");
    return hook;
  }

  it("toggle, move and reset write the store keys and notify subscribers", async () => {
    const store = createStore();
    const hook = mountHook(store);
    hook.publish([{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(hook.columns.value.map((c) => c.id)).toEqual(["a", "b", "c"]);

    hook.toggle("b");
    expect(store.getItem("t")).toEqual(["b"]);
    expect(hook.hidden.value).toEqual(["b"]);
    hook.toggle("b");
    expect(hook.hidden.value).toEqual([]);

    hook.move("b", 1);
    expect(store.getItem("t_columnOrder")).toEqual(["a", "c", "b"]);
    expect(hook.order.value).toEqual(["a", "c", "b"]);

    hook.toggle("a");
    hook.reset();
    expect(store.getItem("t")).toBeUndefined();
    expect(store.getItem("t_columnOrder")).toBeUndefined();
    expect(hook.hidden.value).toEqual([]);
    expect(hook.order.value).toEqual([]);
    expect(hook.columns.value).toHaveLength(3);
  });

  it("a toggle on a table with defaultHiddenColumns keeps the other default hidden ids", () => {
    const store = createStore();
    const hook = mountHook(store, { defaultHiddenColumns: ["a", "b"] });
    expect(hook.hidden.value).toEqual(["a", "b"]);

    hook.toggle("a");

    expect(store.getItem("t")).toEqual(["b"]);
    expect(hook.hidden.value).toEqual(["b"]);

    hook.reset();
    expect(hook.hidden.value).toEqual(["a", "b"]);
  });

  it("returns the defaults and no-op setters without a store", () => {
    const dataProvider = fakeDataProvider<typeof resources>({
      posts: structuredClone(seed),
    });
    let hook: ReturnType<typeof useDataTableColumns> | undefined;
    mount(Admin, {
      props: { dataProvider },
      global: { plugins: [memoryRouter()] },
      slots: {
        default: () =>
          h(
            defineComponent({
              setup() {
                hook = useDataTableColumns({
                  storeKey: "t",
                  defaultHiddenColumns: ["a"],
                });
                return () => null;
              },
            }),
          ),
      },
    });

    hook?.toggle("b");
    hook?.move("a", 1);
    hook?.publish([{ id: "a" }]);
    hook?.reset();

    expect(hook?.hidden.value).toEqual(["a"]);
    expect(hook?.order.value).toEqual([]);
    expect(hook?.columns.value).toEqual([]);
  });
});
