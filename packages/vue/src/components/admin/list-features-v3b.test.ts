/**
 * V3-b Task 1 gate probes: the `<Show>` view renders a display field off the
 * fetched record; `<DataTable :bulk-actions>` selection surfaces the
 * `<BulkActionsToolbar>` (count + unselect); `<FilterForm>` drives the ambient
 * `setFilters`; `<ListPagination>` shows the range + advances the page. All
 * mounted under a real `<Admin>` + router (the Task-5 controller harness).
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import { type ListContextValue, useListContext } from "../../list/list-context";
import TextField from "./fields/text-field.vue";
import TextInput from "./inputs/text-input.vue";
import DataTable from "./list/data-table.vue";
import DataTableCol from "./list/data-table-col.vue";
import FilterForm from "./list/filter-form.vue";
import ListPagination from "./list/list-pagination.vue";
import List from "./view/list.vue";
import Show from "./view/show.vue";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type Resources = typeof resources;
interface Post {
  id: number;
  title: string;
  views: number;
}

const seed: Post[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${String(i + 1).padStart(2, "0")}`,
  views: (i * 7) % 5,
}));

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

function mountAdmin(render: () => unknown) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider };
}

/** A renderless probe that captures the ambient list context for assertions. */
function listProbe(capture: { list?: ListContextValue }) {
  return defineComponent({
    setup() {
      capture.list = useListContext();
      return () => null;
    },
  });
}

const settled = (capture: { list?: ListContextValue }) =>
  vi.waitFor(() => expect(capture.list?.isPending).toBe(false));

describe("<Show>", () => {
  it("renders a display field off the fetched record", async () => {
    const { wrapper } = mountAdmin(() =>
      h(Show, { resource: "posts", id: 2 }, () =>
        h(TextField, { source: "title" }),
      ),
    );
    await vi.waitFor(() => expect(wrapper.text()).toContain("t02"));
  });
});

describe("<DataTable> selection + <BulkActionsToolbar>", () => {
  function mountTable(capture: { list?: ListContextValue }) {
    return mountAdmin(() =>
      h(
        List,
        { resource: "posts", perPage: 25 },
        {
          default: () => [
            h(listProbe(capture)),
            h(
              DataTable,
              { bulkActions: true },
              {
                default: () => h(DataTableCol, { source: "title" }),
              },
            ),
          ],
        },
      ),
    );
  }

  it("is hidden until a row is selected, then shows the count", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountTable(capture);
    await settled(capture);

    expect(wrapper.find('[data-slot="bulk-actions-toolbar"]').exists()).toBe(
      false,
    );

    await wrapper.find('input[aria-label="Select row"]').setValue(true);

    expect(capture.list?.selectedIds).toHaveLength(1);
    const toolbar = wrapper.find('[data-slot="bulk-actions-toolbar"]');
    expect(toolbar.exists()).toBe(true);
    expect(wrapper.find('[data-slot="bulk-count"]').text()).toContain(
      "1 rows selected",
    );
  });

  it("select-all selects the page; unselect clears the toolbar", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountTable(capture);
    await settled(capture);

    await wrapper
      .find('input[aria-label="Select all rows on this page"]')
      .setValue(true);
    expect(capture.list?.selectedIds).toHaveLength(25);

    await wrapper
      .find('[data-slot="bulk-actions-toolbar"] button')
      .trigger("click");
    expect(capture.list?.selectedIds).toHaveLength(0);
    expect(wrapper.find('[data-slot="bulk-actions-toolbar"]').exists()).toBe(
      false,
    );
  });
});

describe("<FilterForm>", () => {
  it("drives the ambient setFilters as the user types", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(FilterForm, null, {
              default: () => h(TextInput, { source: "title" }),
            }),
          ],
        },
      ),
    );
    await settled(capture);

    await wrapper.find('input[data-slot="input"]').setValue("t05");

    await vi.waitFor(
      () => expect(capture.list?.filter).toEqual({ title: "t05" }),
      { timeout: 2000 },
    );
  });

  function mountFilterForm() {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(FilterForm, null, {
              default: () => h(TextInput, { source: "title" }),
            }),
          ],
        },
      ),
    );
    return { capture, wrapper };
  }

  it("typing keeps a filter the form has no input for", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);

    capture.list?.setFilters({ views: 3 });
    await vi.waitFor(() => expect(capture.list?.filter).toEqual({ views: 3 }));
    // Let the URL sync settle: it re-seeds the list from the URL otherwise.
    await flushPromises();

    await wrapper.find('input[data-slot="input"]').setValue("t05");

    await vi.waitFor(
      () => expect(capture.list?.filter).toEqual({ views: 3, title: "t05" }),
      { timeout: 2000 },
    );
  });

  it("clearing the list filter elsewhere empties the inputs", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);

    const input = wrapper.find('input[data-slot="input"]');
    await input.setValue("t05");
    await vi.waitFor(
      () => expect(capture.list?.filter).toEqual({ title: "t05" }),
      { timeout: 2000 },
    );

    capture.list?.setFilters({});
    await vi.waitFor(() =>
      expect((input.element as HTMLInputElement).value).toBe(""),
    );
  });

  it("an external filter change fills the matching input", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);

    capture.list?.setFilters({ title: "t07" });

    await vi.waitFor(() =>
      expect(
        (wrapper.find('input[data-slot="input"]').element as HTMLInputElement)
          .value,
      ).toBe("t07"),
    );
  });
});

describe("<ListPagination>", () => {
  it("shows the range and advances the page", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts", perPage: 10 },
        {
          default: () => [h(listProbe(capture)), h(ListPagination)],
        },
      ),
    );
    await settled(capture);

    expect(wrapper.find('[data-slot="page-range"]').text()).toBe("1-10 of 25");

    await wrapper.find('button[aria-label="Next"]').trigger("click");
    await vi.waitFor(() => expect(capture.list?.page).toBe(2));
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="page-range"]').text()).toBe(
        "11-20 of 25",
      ),
    );
  });
});
