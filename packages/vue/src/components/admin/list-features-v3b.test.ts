/**
 * V3-b Task 1 gate probes: the `<Show>` view renders a display field off the
 * fetched record; `<DataTable :bulk-actions>` selection surfaces the
 * `<BulkActionsToolbar>` (count + unselect); `<FilterForm>` drives the ambient
 * `setFilters`; `<ListPagination>` shows the range + advances the page. All
 * mounted under a real `<Admin>` + router (the Task-5 controller harness).
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import { useFormHandle } from "../../form/form-context";
import { type ListContextValue, useListContext } from "../../list/list-context";
import FilterButton from "./buttons/filter-button.vue";
import TextField from "./fields/text-field.vue";
import TextInput from "./inputs/text-input.vue";
import DataTable from "./list/data-table.vue";
import DataTableCol from "./list/data-table-col.vue";
import FilterForm, { type FilterFormEntry } from "./list/filter-form.vue";
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
      "1 item selected",
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

  it("provides an unbound handle: its values are filters, not the resource's record", async () => {
    const seen: {
      resource?: string;
      posts?: ReturnType<typeof useFormHandle<"posts">>;
    } = {};
    const handleProbe = defineComponent({
      setup() {
        seen.resource = useFormHandle().resource;
        seen.posts = useFormHandle("posts");
        return () => null;
      },
    });
    const capture: { list?: ListContextValue } = {};
    mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(FilterForm, null, { default: () => h(handleProbe) }),
          ],
        },
      ),
    );
    await settled(capture);

    expect(seen.resource).toBeUndefined();
    expect(seen.posts).toBeUndefined();
  });

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
      expect(elementOf(input.element, HTMLInputElement).value).toBe(""),
    );
  });

  const inputValue = (wrapper: ReturnType<typeof mountFilterForm>["wrapper"]) =>
    elementOf(
      wrapper.find('input[data-slot="input"]').element,
      HTMLInputElement,
    ).value;
  const pastDebounce = () => new Promise((r) => setTimeout(r, 700));

  it("typing back to the current filter cancels the push still waiting", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);
    capture.list?.setFilters({ title: "t05" });
    await vi.waitFor(() => expect(inputValue(wrapper)).toBe("t05"));
    await flushPromises();

    const input = wrapper.find('input[data-slot="input"]');
    await input.setValue("t05x");
    await input.setValue("t05");
    await pastDebounce();

    expect(capture.list?.filter).toEqual({ title: "t05" });
    expect(inputValue(wrapper)).toBe("t05");
  });

  it("an edit that leaves the filter unchanged does not hide a later external change", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);

    const input = wrapper.find('input[data-slot="input"]');
    await input.setValue("a");
    await input.setValue("");
    capture.list?.setFilters({ title: "t07" });

    await vi.waitFor(() => expect(inputValue(wrapper)).toBe("t07"));
  });

  it("an external change made while an edit is waiting wins over the edit", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);

    await wrapper.find('input[data-slot="input"]').setValue("abc");
    capture.list?.setFilters({ views: 3 });

    await vi.waitFor(() => expect(inputValue(wrapper)).toBe(""));
    await pastDebounce();
    expect(capture.list?.filter).toEqual({ views: 3 });
  });

  it("an external call that leaves the filter as it was still empties an edit it cancelled", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);

    await wrapper.find('input[data-slot="input"]').setValue("abc");
    capture.list?.setFilters({});

    await vi.waitFor(() => expect(inputValue(wrapper)).toBe(""));
    await pastDebounce();
    expect(capture.list?.filter).toEqual({});
  });

  it("an external filter change fills the matching input", async () => {
    const { capture, wrapper } = mountFilterForm();
    await settled(capture);

    capture.list?.setFilters({ title: "t07" });

    await vi.waitFor(() =>
      expect(
        elementOf(
          wrapper.find('input[data-slot="input"]').element,
          HTMLInputElement,
        ).value,
      ).toBe("t07"),
    );
  });
});

describe("<FilterForm> filters prop", () => {
  const entries: FilterFormEntry[] = [
    { source: "title", label: "Title", component: TextInput },
    { source: "views", label: "Views", component: TextInput },
  ];

  function mountEntries(
    filters: FilterFormEntry[],
    slot?: () => unknown,
    withButton = false,
  ) {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            withButton ? h(FilterButton, { filters }) : null,
            h(FilterForm, { filters }, slot ? { default: slot } : undefined),
          ],
        },
      ),
    );
    return { capture, wrapper };
  }

  const field = (
    wrapper: ReturnType<typeof mountEntries>["wrapper"],
    source: string,
  ) => wrapper.find(`.filter-field[data-source="${source}"]`);

  it("an alwaysOn entry renders with no remove button", async () => {
    const { capture, wrapper } = mountEntries([
      { source: "title", component: TextInput, alwaysOn: true },
      { source: "views", component: TextInput },
    ]);
    await settled(capture);

    expect(field(wrapper, "title").exists()).toBe(true);
    expect(field(wrapper, "title").find("input").exists()).toBe(true);
    expect(field(wrapper, "title").find("button").exists()).toBe(false);
    expect(field(wrapper, "views").exists()).toBe(false);
  });

  it("choosing an entry in FilterButton renders its input", async () => {
    const { capture, wrapper } = mountEntries(entries, undefined, true);
    await settled(capture);
    expect(field(wrapper, "title").exists()).toBe(false);

    await wrapper
      .find('[data-slot="filter-button"] .add-filter')
      .trigger("click");
    await wrapper.find('[data-field="title"]').trigger("click");

    await vi.waitFor(() => expect(field(wrapper, "title").exists()).toBe(true));
    expect(field(wrapper, "title").text()).toContain("Title");
    expect(field(wrapper, "views").exists()).toBe(false);
  });

  it("a filter with a nested source shows as set when the list filter holds a value at that path", async () => {
    const { capture, wrapper } = mountEntries([
      { source: "tags[0].label", component: TextInput },
    ]);
    await settled(capture);
    expect(field(wrapper, "tags[0].label").exists()).toBe(false);

    capture.list?.setFilters({ tags: [{ label: "news" }] });

    await vi.waitFor(() =>
      expect(field(wrapper, "tags[0].label").exists()).toBe(true),
    );
  });

  it("an entry with a value in the list filter renders without being displayed", async () => {
    const { capture, wrapper } = mountEntries(entries);
    await settled(capture);

    capture.list?.setFilters({ views: "3" });

    await vi.waitFor(() => expect(field(wrapper, "views").exists()).toBe(true));
    expect(capture.list?.displayedFilters?.views).toBeFalsy();
    expect(field(wrapper, "title").exists()).toBe(false);
  });

  it("the remove button hides the entry and clears its filter", async () => {
    const { capture, wrapper } = mountEntries(entries);
    await settled(capture);
    capture.list?.setFilters({ title: "t05" }, { title: true });
    await vi.waitFor(() => expect(field(wrapper, "title").exists()).toBe(true));
    await flushPromises();

    const remove = field(wrapper, "title").find("button");
    expect(remove.attributes("title")).toBe("Remove this filter");
    await remove.trigger("click");

    await vi.waitFor(() =>
      expect(field(wrapper, "title").exists()).toBe(false),
    );
    expect(capture.list?.displayedFilters?.title).toBeFalsy();
    expect(capture.list?.filter).toEqual({});
  });

  it("the remove button clears a nested source and a pending edit", async () => {
    const { capture, wrapper } = mountEntries([
      { source: "title", component: TextInput },
      { source: "author.name", component: TextInput },
    ]);
    await settled(capture);
    capture.list?.setFilters(
      { author: { name: "x" } },
      { "author.name": true },
    );
    await vi.waitFor(() =>
      expect(field(wrapper, "author.name").exists()).toBe(true),
    );
    await flushPromises();

    await field(wrapper, "author.name").find("button").trigger("click");

    await vi.waitFor(() =>
      expect(field(wrapper, "author.name").exists()).toBe(false),
    );
    expect(capture.list?.filter).toEqual({});
  });

  it("alwaysOn with defaultValue throws", () => {
    expect(() =>
      mountEntries([
        {
          source: "title",
          component: TextInput,
          alwaysOn: true,
          defaultValue: "x",
        },
      ]),
    ).toThrow(
      "Cannot use alwaysOn and defaultValue on a filter input. Please use useListController({ filterDefaultValues }) instead.",
    );
  });

  it("slotted inputs still render and drive the filter", async () => {
    const { capture, wrapper } = mountEntries(
      [{ source: "views", component: TextInput, alwaysOn: true }],
      () => h(TextInput, { source: "title" }),
    );
    await settled(capture);

    const inputs = wrapper.findAll('input[data-slot="input"]');
    expect(inputs).toHaveLength(2);
    // The entry's input comes first; the slotted one sits outside any filter-field.
    expect(field(wrapper, "views").find("input").element).toBe(
      inputs[0]?.element,
    );
    expect(inputs[1]?.element.closest(".filter-field")).toBeNull();

    await inputs[1]?.setValue("t05");
    await vi.waitFor(
      () => expect(capture.list?.filter).toEqual({ title: "t05" }),
      { timeout: 2000 },
    );
  });
});

describe("<FilterButton> with FilterForm entries", () => {
  it("the menu leaves out alwaysOn entries", async () => {
    const capture: { list?: ListContextValue } = {};
    const filters: FilterFormEntry[] = [
      { source: "title", component: TextInput, alwaysOn: true },
      { source: "views", component: TextInput },
    ];
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [h(listProbe(capture)), h(FilterButton, { filters })],
        },
      ),
    );
    await settled(capture);

    await wrapper
      .find('[data-slot="filter-button"] .add-filter')
      .trigger("click");

    expect(wrapper.find('[data-field="views"]').exists()).toBe(true);
    expect(wrapper.find('[data-field="title"]').exists()).toBe(false);
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

    await wrapper.find('button[aria-label="Go to next page"]').trigger("click");
    await vi.waitFor(() => expect(capture.list?.page).toBe(2));
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="page-range"]').text()).toBe(
        "11-20 of 25",
      ),
    );
  });

  it("keeps a top margin on its root, and merges a custom class into it", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts", perPage: 10 },
        {
          default: () => [
            h(listProbe(capture)),
            h(ListPagination, { id: "plain" }),
            h(ListPagination, { id: "custom", class: "mt-6 text-red-500" }),
          ],
        },
      ),
    );
    await settled(capture);

    const plain = wrapper.find("#plain").classes();
    expect(plain).toContain("mt-2");

    const custom = wrapper.find("#custom").classes();
    expect(custom).toContain("mt-6");
    expect(custom).toContain("text-red-500");
  });

  it("has the same single top margin inside a <DataTable> as on its own", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts", perPage: 10 },
        {
          default: () => [
            h(listProbe(capture)),
            h(DataTable, null, {
              default: () => h(DataTableCol, { source: "title" }),
            }),
          ],
        },
      ),
    );
    await settled(capture);

    const classes = wrapper.find('[data-slot="list-pagination"]').classes();
    expect(classes.filter((c) => c === "mt-2")).toHaveLength(1);
  });
});
