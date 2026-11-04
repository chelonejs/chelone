/**
 * `<TreeList>`: the records of the ambient `<List>` as a collapsible tree built
 * from a parent field. Mounted as `<Admin><Resource list edit show/></Admin>`
 * with a memory router (the app's composition); assertions are on DOM, roles,
 * hrefs and data-provider calls.
 */

import {
  type DataProvider,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import List from "../view/list.vue";
import TreeList from "./tree-list.vue";

const CATEGORIES = [
  { id: 1, name: "Root A", slug: "a", kind: "folder", parent_id: null },
  { id: 2, name: "Child A1", slug: "a1", kind: "file", parent_id: 1 },
  { id: 3, name: "Grandchild A1x", slug: "a1x", kind: "file", parent_id: 2 },
  { id: 4, name: "Root B", slug: "b", kind: "folder", parent_id: null },
];

const View = defineComponent({ render: () => h("div") });
const FolderIcon = defineComponent({
  render: () => h("svg", { "data-testid": "folder-icon" }),
});
const FileIcon = defineComponent({
  render: () => h("svg", { "data-testid": "file-icon" }),
});

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const items = (wrapper: VueWrapper) =>
  wrapper.findAll('[data-slot="list"] [role="treeitem"]');
const titles = (wrapper: VueWrapper) =>
  items(wrapper).map((item) => item.get("[data-slot=tree-list-title]").text());
const item = (wrapper: VueWrapper, title: string) => {
  const found = items(wrapper).find(
    (node) => node.get("[data-slot=tree-list-title]").text() === title,
  );
  if (!found) throw new Error(`no tree item titled ${title}`);
  return found;
};
const chevron = (wrapper: VueWrapper, title: string) =>
  item(wrapper, title).get("button[data-slot=tree-list-chevron]");

async function mountList({
  list,
  dataProvider = fakeDataProvider({ categories: CATEGORIES }),
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
  edit = true,
  show = true,
}: {
  list: () => VNodeChild;
  dataProvider?: DataProvider;
  queryClient?: QueryClient;
  edit?: boolean;
  show?: boolean;
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/categories");
  const CategoryList = defineComponent({
    setup: () => () => h(List, { resource: "categories" }, { default: list }),
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        {
          default: () =>
            h(Resource, {
              name: "categories",
              list: CategoryList,
              edit: edit ? View : undefined,
              show: show ? View : undefined,
            }),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

const tree =
  (props: Record<string, unknown> = {}, slots = {}) =>
  () =>
    h(TreeList, { parentSource: "parent_id", ...props }, slots);

describe("<TreeList>", () => {
  it("renders roots and, once expanded, nested children at the right depth", async () => {
    const { wrapper } = await mountList({ list: tree() });

    expect(wrapper.find('[role="tree"]').exists()).toBe(true);
    expect(titles(wrapper)).toEqual(["Root A", "Root B"]);

    await chevron(wrapper, "Root A").trigger("click");
    expect(titles(wrapper)).toEqual(["Root A", "Child A1", "Root B"]);

    await chevron(wrapper, "Child A1").trigger("click");
    expect(titles(wrapper)).toEqual([
      "Root A",
      "Child A1",
      "Grandchild A1x",
      "Root B",
    ]);
    const levels = items(wrapper).map((node) => node.attributes("aria-level"));
    expect(levels).toEqual(["1", "2", "3", "1"]);
    expect(
      item(wrapper, "Child A1")
        .find('[role="group"] [role="treeitem"]')
        .exists(),
    ).toBe(true);
  });

  it("starts collapsed and shows children with defaultExpanded", async () => {
    const collapsed = await mountList({ list: tree() });
    expect(item(collapsed.wrapper, "Root A").attributes("aria-expanded")).toBe(
      "false",
    );

    const open = await mountList({ list: tree({ defaultExpanded: true }) });
    expect(titles(open.wrapper)).toEqual([
      "Root A",
      "Child A1",
      "Grandchild A1x",
      "Root B",
    ]);
    expect(item(open.wrapper, "Root A").attributes("aria-expanded")).toBe(
      "true",
    );
  });

  it("the chevron expands and collapses a branch without selecting it", async () => {
    const onSelect = vi.fn();
    const { wrapper, router } = await mountList({
      list: tree({ onSelect }),
    });

    expect(chevron(wrapper, "Root A").attributes("aria-label")).toBe("Expand");
    await chevron(wrapper, "Root A").trigger("click");
    expect(item(wrapper, "Root A").attributes("aria-expanded")).toBe("true");
    expect(chevron(wrapper, "Root A").attributes("aria-label")).toBe(
      "Collapse",
    );

    await chevron(wrapper, "Root A").trigger("click");
    expect(titles(wrapper)).toEqual(["Root A", "Root B"]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe("/categories");
  });

  it("a leaf has no chevron and no aria-expanded", async () => {
    const { wrapper } = await mountList({ list: tree() });

    const leaf = item(wrapper, "Root B");
    expect(leaf.find("button[data-slot=tree-list-chevron]").exists()).toBe(
      false,
    );
    expect(leaf.attributes("aria-expanded")).toBeUndefined();
  });

  it("titleSource wins over the record representation", async () => {
    const byDefault = await mountList({ list: tree() });
    expect(titles(byDefault.wrapper)).toEqual(["Root A", "Root B"]);

    const bySlug = await mountList({ list: tree({ titleSource: "slug" }) });
    expect(titles(bySlug.wrapper)).toEqual(["a", "b"]);
  });

  it("iconSource picks the component from iconMap", async () => {
    const { wrapper } = await mountList({
      list: tree({
        iconSource: "kind",
        iconMap: { folder: FolderIcon, file: FileIcon },
        defaultExpanded: true,
      }),
    });

    expect(
      item(wrapper, "Root A").find("[data-testid=folder-icon]").exists(),
    ).toBe(true);
    expect(
      item(wrapper, "Child A1").find("[data-testid=file-icon]").exists(),
    ).toBe(true);
  });

  it("titleSource and iconSource read a bracket path", async () => {
    const nested = CATEGORIES.map((category) => ({
      id: category.id,
      parent_id: category.parent_id,
      meta: {
        labels: [{ text: category.slug }],
        kinds: [category.kind],
      },
    }));
    const { wrapper } = await mountList({
      dataProvider: fakeDataProvider({ categories: nested }),
      list: tree({
        titleSource: "meta.labels[0].text",
        iconSource: "meta.kinds[0]",
        iconMap: { folder: FolderIcon, file: FileIcon },
      }),
    });

    expect(titles(wrapper)).toEqual(["a", "b"]);
    expect(item(wrapper, "a").find("[data-testid=folder-icon]").exists()).toBe(
      true,
    );
  });

  it("a select listener receives the record and replaces the navigation", async () => {
    const onSelect = vi.fn();
    const { wrapper, router } = await mountList({
      list: tree({ onSelect }),
    });

    await item(wrapper, "Root B")
      .get("[data-slot=tree-list-row]")
      .trigger("click");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(CATEGORIES[3]);
    expect(router.currentRoute.value.path).toBe("/categories");
  });

  it("without a listener a row links to the edit page, or the show page when there is no edit view", async () => {
    const edit = await mountList({ list: tree() });
    const row = item(edit.wrapper, "Root B").get("[data-slot=tree-list-row]");
    expect(row.attributes("href")).toBe("/categories/4");
    await row.trigger("click");
    await flushPromises();
    expect(edit.router.currentRoute.value.path).toBe("/categories/4");

    const show = await mountList({ edit: false, list: tree() });
    expect(
      item(show.wrapper, "Root B")
        .get("[data-slot=tree-list-row]")
        .attributes("href"),
    ).toBe("/categories/4/show");

    const forced = await mountList({ list: tree({ linkType: "show" }) });
    expect(
      item(forced.wrapper, "Root B")
        .get("[data-slot=tree-list-row]")
        .attributes("href"),
    ).toBe("/categories/4/show");
  });

  it("linkType false leaves rows inert", async () => {
    const { wrapper, router } = await mountList({
      list: tree({ linkType: false }),
    });

    expect(wrapper.findAll('[data-slot="list"] a')).toHaveLength(0);
    await item(wrapper, "Root B")
      .get("[data-slot=tree-list-row]")
      .trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/categories");
  });

  it("arrow keys expand, collapse and move focus", async () => {
    const { wrapper } = await mountList({ list: tree() });
    const focused = () =>
      document.activeElement?.querySelector("[data-slot=tree-list-title]")
        ?.textContent;
    const press = (title: string, key: string) =>
      item(wrapper, title).trigger("keydown", { key });

    (item(wrapper, "Root A").element as HTMLElement).focus();
    await press("Root A", "ArrowRight");
    expect(item(wrapper, "Root A").attributes("aria-expanded")).toBe("true");
    expect(titles(wrapper)).toEqual(["Root A", "Child A1", "Root B"]);

    await press("Root A", "ArrowRight");
    expect(focused()).toBe("Child A1");

    await press("Child A1", "ArrowDown");
    expect(focused()).toBe("Root B");

    await press("Root B", "ArrowUp");
    expect(focused()).toBe("Child A1");

    await press("Child A1", "ArrowLeft");
    expect(focused()).toBe("Root A");

    await press("Root A", "ArrowLeft");
    expect(item(wrapper, "Root A").attributes("aria-expanded")).toBe("false");
    expect(titles(wrapper)).toEqual(["Root A", "Root B"]);
  });

  it("keeps a branch open across a refetch", async () => {
    let rows: LooseRecord[] = CATEGORIES;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const dataProvider: DataProvider = {
      ...fakeDataProvider({ categories: CATEGORIES }),
      getList: async () => ({ data: rows, total: rows.length }),
    };
    const { wrapper } = await mountList({
      list: tree(),
      dataProvider,
      queryClient,
    });
    await chevron(wrapper, "Root A").trigger("click");

    rows = [
      ...CATEGORIES,
      { id: 5, name: "Root C", slug: "c", kind: "folder", parent_id: null },
    ];
    await queryClient.invalidateQueries();
    await flushPromises();

    expect(titles(wrapper)).toEqual(["Root A", "Child A1", "Root B", "Root C"]);
    expect(item(wrapper, "Root A").attributes("aria-expanded")).toBe("true");
  });

  it("lists every record when the parent field has a cycle", async () => {
    const cyclic = [
      { id: 1, name: "One", parent_id: 2 },
      { id: 2, name: "Two", parent_id: 3 },
      { id: 3, name: "Three", parent_id: 1 },
    ];
    const { wrapper } = await mountList({
      dataProvider: fakeDataProvider({ categories: cyclic }),
      list: tree({ defaultExpanded: true }),
    });

    expect(titles(wrapper).sort()).toEqual(["One", "Three", "Two"]);
  });

  it("renders the empty slot with no records and the loading slot while pending", async () => {
    const empty = await mountList({
      dataProvider: fakeDataProvider({ categories: [] }),
      list: tree({}, { empty: () => h("p", "Nothing here") }),
    });
    expect(empty.wrapper.text()).toContain("Nothing here");
    expect(empty.wrapper.text()).not.toContain("No results found");
    expect(empty.wrapper.find('[role="tree"]').exists()).toBe(false);

    const defaultEmpty = await mountList({
      dataProvider: fakeDataProvider({ categories: [] }),
      list: tree(),
    });
    expect(defaultEmpty.wrapper.text()).toContain("No results found");

    const pending: DataProvider = {
      ...fakeDataProvider({ categories: CATEGORIES }),
      getList: () => new Promise(() => {}),
    };
    const loading = await mountList({
      dataProvider: pending,
      list: tree({}, { loading: () => h("p", "Fetching") }),
    });
    expect(loading.wrapper.text()).toContain("Fetching");
  });
});
