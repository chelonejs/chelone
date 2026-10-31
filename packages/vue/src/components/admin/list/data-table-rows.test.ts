/**
 * `<DataTable>` row behaviour: `rowClick`, expandable rows (`#expand`,
 * `expandSingle`, `isRowExpandable`) and `rowClass`. Mounted under `<Admin>`,
 * `<List>` and a memory router, asserting on the DOM, the router location and
 * the ambient list selection.
 */

import {
  defineResources,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import {
  type ListContextValue,
  useListContext,
} from "../../../list/list-context";
import List from "../view/list.vue";
import DataTable, { type DataTableProps } from "./data-table.vue";
import DataTableCol from "./data-table-col.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

const seed = [
  { id: 1, title: "alpha" },
  { id: 2, title: "beta" },
  { id: 3, title: "gamma" },
];

interface ExpandScope {
  id: number;
  record: { title: string };
  resource: string;
}

function mountTable(
  props: Partial<DataTableProps> & Record<string, unknown> = {},
  slots: Record<string, (scope: never) => unknown> = {},
) {
  const capture: { list?: ListContextValue } = {};
  const probe = defineComponent({
    setup() {
      capture.list = useListContext();
      return () => null;
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          {
            default: () =>
              h(
                List,
                { resource: "posts", perPage: 25 },
                {
                  default: () => [
                    h(probe),
                    h(DataTable, props, {
                      default: () => h(DataTableCol, { source: "title" }),
                      ...slots,
                    }),
                  ],
                },
              ),
          },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  const ready = () =>
    vi.waitFor(() => expect(capture.list?.isPending).toBe(false));
  const rows = () => wrapper.findAll('tr[data-slot="data-table-row"]');
  return { wrapper, router, capture, ready, rows };
}

describe("<DataTable> rowClick", () => {
  it("a row click goes to the edit page by default", async () => {
    const { router, ready, rows } = mountTable();
    await ready();

    await rows()[0]?.trigger("click");

    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/posts/1"),
    );
  });

  it("rowClick show goes to the show page", async () => {
    const { router, ready, rows } = mountTable({ rowClick: "show" });
    await ready();

    await rows()[1]?.trigger("click");

    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/posts/2/show"),
    );
  });

  it("rowClick false leaves the row inert", async () => {
    const { router, ready, rows } = mountTable({ rowClick: false });
    await ready();

    await rows()[0]?.trigger("click");

    expect(router.currentRoute.value.path).toBe("/");
    expect(rows()[0]?.classes()).not.toContain("cursor-pointer");
  });

  it("a rowClick function result is used as the link type", async () => {
    const rowClick = vi.fn((_record: unknown, id: unknown) =>
      id === 3 ? false : "show",
    );
    const { router, ready, rows } = mountTable({ rowClick });
    await ready();

    await rows()[2]?.trigger("click");
    expect(router.currentRoute.value.path).toBe("/");

    await rows()[0]?.trigger("click");
    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/posts/1/show"),
    );
    expect(rowClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: "alpha" }),
      1,
    );
  });

  it("rowClick expand toggles the panel and does not navigate", async () => {
    const { wrapper, router, ready, rows } = mountTable(
      { rowClick: "expand" },
      { expand: ({ record }: ExpandScope) => h("p", `panel ${record.title}`) },
    );
    await ready();

    await rows()[0]?.trigger("click");
    expect(wrapper.text()).toContain("panel alpha");
    expect(router.currentRoute.value.path).toBe("/");

    await rows()[0]?.trigger("click");
    expect(wrapper.text()).not.toContain("panel alpha");
  });

  it("rowClick toggleSelection toggles the row selection", async () => {
    const { router, capture, ready, rows } = mountTable({
      rowClick: "toggleSelection",
    });
    await ready();

    await rows()[1]?.trigger("click");
    expect(capture.list?.selectedIds).toEqual([2]);
    expect(router.currentRoute.value.path).toBe("/");

    await rows()[1]?.trigger("click");
    expect(capture.list?.selectedIds).toEqual([]);
  });
});

describe("<DataTable> expandable rows", () => {
  const expand = ({ id, record, resource }: ExpandScope) =>
    h("p", `panel ${resource} ${id} ${record.title}`);

  const toggle = (
    wrapper: ReturnType<typeof mountTable>["wrapper"],
    n: number,
  ) =>
    wrapper.findAll(
      'button[aria-label="Expand row"], button[aria-label="Collapse row"]',
    )[n];

  it("an expand slot adds a toggle per row and shows the panel for that record", async () => {
    const { wrapper, ready } = mountTable({}, { expand });
    await ready();

    expect(wrapper.findAll('button[aria-label="Expand row"]')).toHaveLength(3);
    expect(wrapper.find('[data-slot="data-table-expand-panel"]').exists()).toBe(
      false,
    );

    await toggle(wrapper, 1)?.trigger("click");

    expect(wrapper.text()).toContain("panel posts 2 beta");
    expect(wrapper.text()).not.toContain("panel posts 1 alpha");
    const opened = toggle(wrapper, 1);
    expect(opened?.attributes("aria-label")).toBe("Collapse row");
    expect(opened?.attributes("aria-expanded")).toBe("true");
    // one record column + the leading expand column
    expect(
      wrapper
        .find('[data-slot="data-table-expand-panel"] td')
        .attributes("colspan"),
    ).toBe("2");

    await toggle(wrapper, 1)?.trigger("click");
    expect(wrapper.text()).not.toContain("panel posts 2 beta");
  });

  it("expandSingle collapses the open row and shows no expand-all button", async () => {
    const { wrapper, ready } = mountTable({ expandSingle: true }, { expand });
    await ready();

    expect(wrapper.find('button[aria-label="Expand all rows"]').exists()).toBe(
      false,
    );

    await toggle(wrapper, 0)?.trigger("click");
    await toggle(wrapper, 1)?.trigger("click");

    expect(wrapper.text()).toContain("panel posts 2 beta");
    expect(wrapper.text()).not.toContain("panel posts 1 alpha");
  });

  it("isRowExpandable hides the toggle on a row it rejects", async () => {
    const { wrapper, ready } = mountTable(
      { isRowExpandable: (record: LooseRecord) => record.id !== 2 },
      { expand },
    );
    await ready();

    expect(wrapper.findAll('button[aria-label="Expand row"]')).toHaveLength(2);
  });

  it("the expand-all button opens and closes every expandable row", async () => {
    const { wrapper, ready } = mountTable(
      { isRowExpandable: (record: LooseRecord) => record.id !== 2 },
      { expand },
    );
    await ready();

    await wrapper.find('button[aria-label="Expand all rows"]').trigger("click");
    expect(wrapper.text()).toContain("panel posts 1 alpha");
    expect(wrapper.text()).toContain("panel posts 3 gamma");
    expect(wrapper.text()).not.toContain("panel posts 2 beta");

    await wrapper
      .find('button[aria-label="Collapse all rows"]')
      .trigger("click");
    expect(wrapper.find('[data-slot="data-table-expand-panel"]').exists()).toBe(
      false,
    );
  });

  it("the expand-all button ignores expanded rows that left the page", async () => {
    const { wrapper, capture, ready } = mountTable({}, { expand });
    await ready();

    await toggle(wrapper, 0)?.trigger("click");
    capture.list?.setFilters({ title: "beta" }, {});
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-slot="data-table-row"]')).toHaveLength(1),
    );

    await wrapper.find('button[aria-label="Expand all rows"]').trigger("click");
    expect(wrapper.text()).toContain("panel posts 2 beta");
  });

  it("the expand panel spans a column added after mount", async () => {
    const showExtra = ref(false);
    const { wrapper, ready } = mountTable(
      {},
      {
        expand,
        default: () => [
          h(DataTableCol, { source: "title" }),
          showExtra.value
            ? h(DataTableCol, { source: "title", label: "x" })
            : null,
        ],
      },
    );
    await ready();
    await toggle(wrapper, 0)?.trigger("click");
    const span = () =>
      wrapper
        .find('[data-slot="data-table-expand-panel"] td')
        .attributes("colspan");
    expect(span()).toBe("2");

    showExtra.value = true;
    await vi.waitFor(() => expect(span()).toBe("3"));
  });

  it("clicking a row toggle does not navigate", async () => {
    const { wrapper, router, ready } = mountTable({}, { expand });
    await ready();

    await toggle(wrapper, 0)?.trigger("click");
    expect(wrapper.text()).toContain("panel posts 1");
    await wrapper.find('button[aria-label$="all rows"]').trigger("click");
    expect(wrapper.text()).not.toContain("panel posts 1");

    expect(router.currentRoute.value.path).toBe("/");
  });
});

describe("<DataTable> rowClass", () => {
  it("rowClass adds its class to the matching rows", async () => {
    const rowClass = vi.fn((record: LooseRecord, index: number) =>
      record.id === 2 ? `row-${index}` : undefined,
    );
    const { ready, rows } = mountTable({ rowClass });
    await ready();

    expect(rows().map((r) => r.classes().includes("row-1"))).toEqual([
      false,
      true,
      false,
    ]);
    expect(rowClass).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      0,
    );
  });
});
