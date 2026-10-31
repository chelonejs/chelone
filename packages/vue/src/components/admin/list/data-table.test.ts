/**
 * `<DataTableCol>` sorting, label, class and slot options, and
 * `<DataTableNumberCol>`, mounted under a real `<Admin>` + `<List>`.
 */

import {
  type AnyCheloneI18n,
  createI18n,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import {
  type ListContextValue,
  useListContext,
} from "../../../list/list-context";
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

type Capture = { list?: ListContextValue };

function mountTable(
  columns: () => unknown[],
  options: { i18n?: AnyCheloneI18n } = {},
) {
  const capture: Capture = {};
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
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
          { dataProvider, queryClient, i18n: options.i18n },
          {
            default: () =>
              h(
                List,
                { resource: "posts" },
                {
                  default: () => [
                    h(probe),
                    h(DataTable, null, { default: () => columns() }),
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
