/**
 * `<ListActions>` and `<ListToolbar>`: the bar of filter form, filter, create
 * and export controls above a list. Mounted as the `actions` slot of a real
 * `<List>` under `<Admin><Resource list create/></Admin>` with a memory router;
 * assertions are on DOM, roles and data-provider calls.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import TextInput from "../inputs/text-input.vue";
import List from "../view/list.vue";
import type { FilterFormEntry } from "./filter-form.vue";
import ListActions from "./list-actions.vue";
import ListToolbar from "./list-toolbar.vue";

const View = defineComponent({ render: () => h("div") });

async function mountActions(
  actions: () => VNodeChild,
  { hasCreate = true }: { hasCreate?: boolean } = {},
) {
  const dataProvider = fakeDataProvider({
    posts: [
      { id: 1, title: "hello" },
      { id: 2, title: "world" },
    ],
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/posts");
  const PostList = defineComponent({
    setup: () => () =>
      h(List, { resource: "posts" }, { actions, default: () => null }),
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          queryClient: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
        },
        {
          default: () =>
            h(Resource, {
              name: "posts",
              list: PostList,
              create: hasCreate ? View : undefined,
            }),
        },
      ),
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  await flushPromises();

  return { wrapper, dataProvider };
}

/** The controls inside the list, away from the layout's menu links. */
const inList = (wrapper: ReturnType<typeof mount>) => ({
  create: wrapper.find('[data-slot="list"] [data-slot="create-button"]'),
  exportButton: wrapper.find('[data-slot="list"] [data-slot="export-button"]'),
  filterButton: wrapper.find('[data-slot="list"] [data-slot="filter-button"]'),
  inputs: wrapper.findAll('[data-slot="list"] input'),
});

const optional: FilterFormEntry[] = [
  { source: "title", label: "Title", component: TextInput },
];
const alwaysOn: FilterFormEntry[] = [
  { source: "title", label: "Title", component: TextInput, alwaysOn: true },
];

describe("<ListActions>", () => {
  it("renders the create and export buttons by default", async () => {
    const { wrapper } = await mountActions(() => h(ListActions));
    const { create, exportButton, filterButton } = inList(wrapper);
    expect(create.attributes("aria-label")).toBe("Create");
    expect(create.attributes("href")).toBe("/posts/create");
    expect(exportButton.attributes("aria-label")).toBe("Export");
    expect(filterButton.exists()).toBe(false);
  });

  it("renders the filter button only when a filter entry is not alwaysOn", async () => {
    const withAlwaysOn = await mountActions(() =>
      h(ListActions, { filters: alwaysOn }),
    );
    expect(inList(withAlwaysOn.wrapper).filterButton.exists()).toBe(false);

    const withOptional = await mountActions(() =>
      h(ListActions, { filters: [...alwaysOn, ...optional] }),
    );
    expect(inList(withOptional.wrapper).filterButton.exists()).toBe(true);
  });

  it("hides the create button when the resource has no create view", async () => {
    const { wrapper } = await mountActions(() => h(ListActions), {
      hasCreate: false,
    });
    const { create, exportButton } = inList(wrapper);
    expect(exportButton.exists()).toBe(true);
    expect(create.exists()).toBe(false);
  });

  it("hasCreate overrides the resource's create view", async () => {
    const { wrapper } = await mountActions(() =>
      h(ListActions, { hasCreate: false }),
    );
    expect(inList(wrapper).exportButton.exists()).toBe(true);
    expect(inList(wrapper).create.exists()).toBe(false);
  });

  it("exporter false hides the export button and a function exporter runs on export", async () => {
    const hidden = await mountActions(() =>
      h(ListActions, { exporter: false }),
    );
    expect(inList(hidden.wrapper).create.exists()).toBe(true);
    expect(inList(hidden.wrapper).exportButton.exists()).toBe(false);

    const exporter = vi.fn();
    const { wrapper } = await mountActions(() => h(ListActions, { exporter }));
    await inList(wrapper).exportButton.trigger("click");
    await vi.waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
    expect(exporter.mock.calls[0]?.[0]).toHaveLength(2);
    expect(exporter.mock.calls[0]?.[2]).toBe("posts");
  });

  it("the default slot replaces the default buttons", async () => {
    const { wrapper } = await mountActions(() =>
      h(ListActions, null, { default: () => h("button", "Mine") }),
    );
    expect(wrapper.find('[data-slot="list"]').text()).toContain("Mine");
    const { create, exportButton } = inList(wrapper);
    expect(create.exists()).toBe(false);
    expect(exportButton.exists()).toBe(false);
  });
});

describe("<ListToolbar>", () => {
  it("renders the filter form beside the default actions", async () => {
    const { wrapper } = await mountActions(() =>
      h(ListToolbar, { filters: alwaysOn }),
    );
    const { create, exportButton, inputs } = inList(wrapper);
    expect(inputs).toHaveLength(1);
    expect(create.exists()).toBe(true);
    expect(exportButton.exists()).toBe(true);
  });

  it("choosing a filter in the button shows its input in the form", async () => {
    const { wrapper } = await mountActions(() =>
      h(ListToolbar, { filters: optional }),
    );
    expect(inList(wrapper).inputs).toHaveLength(0);

    await wrapper
      .find('[data-slot="filter-button"] .add-filter')
      .trigger("click");
    await wrapper.find('[data-field="title"]').trigger("click");

    await vi.waitFor(() => expect(inList(wrapper).inputs).toHaveLength(1));
  });

  it("hands its exporter and hasCreate to the default actions", async () => {
    const exporter = vi.fn();
    const { wrapper } = await mountActions(() =>
      h(ListToolbar, { exporter, hasCreate: false }),
    );
    expect(inList(wrapper).create.exists()).toBe(false);
    await inList(wrapper).exportButton.trigger("click");
    await vi.waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
  });

  it("passes its default slot to the filter form", async () => {
    const { wrapper } = await mountActions(() =>
      h(
        ListToolbar,
        { filters: alwaysOn },
        { default: () => h(TextInput, { source: "body" }) },
      ),
    );
    expect(inList(wrapper).inputs).toHaveLength(2);
  });

  it("actions false renders no actions", async () => {
    const { wrapper } = await mountActions(() =>
      h(ListToolbar, { filters: alwaysOn, actions: false }),
    );
    const { create, exportButton, inputs } = inList(wrapper);
    expect(inputs).toHaveLength(1);
    expect(create.exists()).toBe(false);
    expect(exportButton.exists()).toBe(false);
  });

  it("the actions slot replaces the default actions", async () => {
    const { wrapper } = await mountActions(() =>
      h(
        ListToolbar,
        { filters: alwaysOn },
        { actions: () => h("button", "Mine") },
      ),
    );
    const { create, exportButton, inputs } = inList(wrapper);
    expect(wrapper.find('[data-slot="list"]').text()).toContain("Mine");
    expect(inputs).toHaveLength(1);
    expect(create.exists()).toBe(false);
    expect(exportButton.exists()).toBe(false);
  });
});
