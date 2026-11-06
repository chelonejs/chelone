/**
 * `useSavedQueries` and `<SavedQueriesList>`: named list queries persisted in
 * the KV store, applied to the ambient list with one `setParams` call. Mounted
 * under a real `<Admin>`; assertions are on DOM, roles, the store and
 * data-provider calls.
 */

import {
  type CheloneStore,
  createStore,
  fakeDataProvider,
  type SavedQuery,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { type DOMWrapper, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, reactive, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { makeListContext } from "../../__fixtures__/list-context";
import Admin from "../../admin/admin.vue";
import {
  type ListContextValue,
  provideListContext,
  useListContext,
} from "../../list/list-context";
import { provideResourceContext } from "../../resource-context";
import { useSavedQueries } from "../../store/use-saved-queries";
import SavedQueriesList from "./list/saved-queries-list.vue";
import List from "./view/list.vue";

const mounted: VueWrapper[] = [];
// A form only submits from a click while it is attached to the document.
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const savedValue = (title: string, perPage = 10) => ({
  filter: { title },
  displayedFilters: { title: true },
  sort: [{ field: "id", order: "DESC" as const }],
  perPage,
});

const seeded = (): CheloneStore => {
  const store = createStore();
  store.setItem<SavedQuery[]>("posts.savedQueries", [
    { label: "Hello posts", value: savedValue("hello", 10) },
    { label: "World posts", value: savedValue("world", 25) },
  ]);
  return store;
};

function mountAdmin(
  store: CheloneStore | undefined,
  render: () => VNodeChild,
  dataProvider = fakeDataProvider({}),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      // An empty layout node keeps the default chrome out of the DOM.
      return () =>
        h(
          Admin,
          { dataProvider, queryClient, store },
          { default: render, layout: () => h("div") },
        );
    },
  });
  const wrapper = mount(Harness, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}

type ListState = Partial<
  Pick<ListContextValue, "filter" | "displayedFilters" | "sort" | "perPage">
>;

/**
 * A list context stub: the fixture's whole `ListContextValue` surface with the
 * test's params and a `setParams` spy on top. Reactive so a test can write
 * `list.filter` and the component re-renders.
 *
 * The `id` DESC sort is the stub's own default, not the fixture's empty one:
 * `<SavedQueriesList>` saves the list's sort, and the save assertions read it.
 */
function makeList(state: ListState = {}) {
  const setParams = vi.fn();
  const list = reactive(
    makeListContext({
      ...state,
      sort: state.sort ?? [{ field: "id", order: "DESC" }],
      setParams,
    }),
  );
  return { list, setParams };
}

/** Mounts `<SavedQueriesList>` under the `posts` resource over a stubbed list. */
function mountStub(store: CheloneStore, state: ListState = {}, props = {}) {
  const { list, setParams } = makeList(state);
  const Host = defineComponent({
    setup() {
      provideResourceContext("posts");
      provideListContext(list);
      return () => h(SavedQueriesList, props);
    },
  });
  const wrapper = mountAdmin(store, () => h(Host));
  return { wrapper, setParams, list };
}

/**
 * The first button whose text, or `aria-label`, equals `name` (a string) or
 * matches it (a regex). The remove buttons are icon-only, so only their label
 * names them.
 */
const button = (
  wrapper: VueWrapper | DOMWrapper<Element>,
  name: RegExp | string,
) =>
  wrapper
    .findAll("button")
    .find((b) =>
      typeof name === "string"
        ? b.text() === name || b.attributes("aria-label") === name
        : name.test(b.text()) || name.test(b.attributes("aria-label") ?? ""),
    );

const labels = (store: CheloneStore) =>
  store.getItem<SavedQuery[]>("posts.savedQueries")?.map((q) => q.label);

describe("useSavedQueries", () => {
  it("returns the persisted queries and updates on save and remove", async () => {
    const store = seeded();
    let api: ReturnType<typeof useSavedQueries> | undefined;
    const Probe = defineComponent({
      setup() {
        api = useSavedQueries("posts");
        return () => h("div");
      },
    });
    mountAdmin(store, () => h(Probe));
    expect(api?.queries.value.map((q) => q.label)).toEqual([
      "Hello posts",
      "World posts",
    ]);

    api?.save("Third", savedValue("third"));
    expect(api?.queries.value.map((q) => q.label)).toEqual([
      "Hello posts",
      "World posts",
      "Third",
    ]);
    expect(labels(store)).toEqual(["Hello posts", "World posts", "Third"]);

    api?.remove("Hello posts");
    expect(api?.queries.value.map((q) => q.label)).toEqual([
      "World posts",
      "Third",
    ]);
    expect(labels(store)).toEqual(["World posts", "Third"]);
  });

  it("keeps the queries in the instance when the app has no store", () => {
    let api: ReturnType<typeof useSavedQueries> | undefined;
    const Probe = defineComponent({
      setup() {
        api = useSavedQueries("posts");
        return () => h("div");
      },
    });
    mountAdmin(undefined, () => h(Probe));
    api?.save("Local", savedValue("local"));
    expect(api?.queries.value.map((q) => q.label)).toEqual(["Local"]);
  });

  it("follows a change written to the store by another instance", async () => {
    const store = createStore();
    const apis: ReturnType<typeof useSavedQueries>[] = [];
    const Probe = defineComponent({
      setup() {
        apis.push(useSavedQueries("posts"));
        return () => h("div");
      },
    });
    mountAdmin(store, () => [h(Probe), h(Probe)]);

    apis[0]?.save("Shared", savedValue("shared"));
    expect(apis[1]?.queries.value.map((q) => q.label)).toEqual(["Shared"]);
    apis[1]?.remove("Shared");
    expect(apis[0]?.queries.value).toEqual([]);
  });
});

describe("SavedQueriesList", () => {
  it("lists the saved queries of the resource", () => {
    const store = seeded();
    store.setItem<SavedQuery[]>("comments.savedQueries", [
      { label: "Other resource", value: savedValue("x") },
    ]);
    const { wrapper } = mountStub(store);
    expect(button(wrapper, "Hello posts")).toBeDefined();
    expect(button(wrapper, "World posts")).toBeDefined();
    expect(wrapper.text()).not.toContain("Other resource");
  });

  it("lists the queries of an explicit resource prop", () => {
    const store = createStore();
    store.setItem<SavedQuery[]>("comments.savedQueries", [
      { label: "Other resource", value: savedValue("x") },
    ]);
    const { wrapper } = mountStub(store, {}, { resource: "comments" });
    expect(button(wrapper, "Other resource")).toBeDefined();
  });

  it("clicking a query calls setParams once with its filter, displayedFilters, sort and perPage", async () => {
    const { wrapper, setParams } = mountStub(seeded());
    await button(wrapper, "World posts")?.trigger("click");
    expect(setParams).toHaveBeenCalledTimes(1);
    expect(setParams).toHaveBeenCalledWith({
      filter: { title: "world" },
      displayedFilters: { title: true },
      sort: [{ field: "id", order: "DESC" }],
      perPage: 25,
    });
  });

  it("marks the query matching the list with aria-pressed and clicking it clears the filter", async () => {
    const { wrapper, setParams } = mountStub(seeded(), {
      filter: { title: "hello" },
      perPage: 10,
    });
    const active = button(wrapper, "Hello posts");
    expect(active?.attributes("aria-pressed")).toBe("true");
    expect(button(wrapper, "World posts")?.attributes("aria-pressed")).toBe(
      "false",
    );

    await active?.trigger("click");
    expect(setParams).toHaveBeenCalledTimes(1);
    expect(setParams).toHaveBeenCalledWith({ filter: {} });
  });

  it("saves the current params under the typed name", async () => {
    const store = createStore();
    const { wrapper } = mountStub(store, {
      filter: { title: "draft" },
      displayedFilters: { title: true },
      perPage: 5,
    });
    await button(wrapper, "Save current query")?.trigger("click");
    await wrapper
      .find('input[aria-label="Query name"]')
      .setValue("  My drafts ");
    await button(wrapper, "Save")?.trigger("click");

    expect(store.getItem("posts.savedQueries")).toEqual([
      {
        label: "My drafts",
        value: {
          filter: { title: "draft" },
          displayedFilters: { title: true },
          sort: [{ field: "id", order: "DESC" }],
          perPage: 5,
        },
      },
    ]);
    // The form closes and the new query is listed.
    expect(wrapper.find('input[aria-label="Query name"]').exists()).toBe(false);
    expect(button(wrapper, "My drafts")).toBeDefined();
  });

  it("offers no save while the filter is empty or a saved query already matches", async () => {
    const { wrapper, list } = mountStub(seeded(), { filter: {} });
    expect(button(wrapper, "Save current query")).toBeUndefined();

    list.filter = { title: "hello" };
    await nextTick();
    expect(button(wrapper, "Save current query")).toBeUndefined();

    list.filter = { title: "other" };
    await nextTick();
    expect(button(wrapper, "Save current query")).toBeDefined();
  });

  it("closes the name form when the list stops being saveable", async () => {
    const { wrapper, list } = mountStub(createStore(), {
      filter: { title: "draft" },
    });
    await button(wrapper, "Save current query")?.trigger("click");
    await wrapper.find('input[aria-label="Query name"]').setValue("Foo");

    list.filter = {};
    await nextTick();
    expect(wrapper.find('input[aria-label="Query name"]').exists()).toBe(false);
    expect(button(wrapper, "Save current query")).toBeUndefined();

    // Saveable again: the button is back, not a form still holding "Foo".
    list.filter = { title: "next" };
    await nextTick();
    expect(wrapper.find('input[aria-label="Query name"]').exists()).toBe(false);
    await button(wrapper, "Save current query")?.trigger("click");
    expect(
      elementOf(
        wrapper.find('input[aria-label="Query name"]').element,
        HTMLInputElement,
      ).value,
    ).toBe("");
  });

  it("saving an existing name replaces that query", async () => {
    const store = seeded();
    const { wrapper } = mountStub(store, {
      filter: { title: "fresh" },
      perPage: 10,
    });
    await button(wrapper, "Save current query")?.trigger("click");
    await wrapper
      .find('input[aria-label="Query name"]')
      .setValue("Hello posts");
    await button(wrapper, "Save")?.trigger("click");

    const saved = store.getItem<SavedQuery[]>("posts.savedQueries");
    expect(saved?.map((q) => q.label)).toEqual(["Hello posts", "World posts"]);
    expect(saved?.[0]?.value.filter).toEqual({ title: "fresh" });
  });

  it("saves and removes under an explicit resource prop", async () => {
    const store = createStore();
    const { wrapper } = mountStub(
      store,
      { filter: { title: "draft" } },
      { resource: "comments" },
    );
    await button(wrapper, "Save current query")?.trigger("click");
    await wrapper.find('input[aria-label="Query name"]').setValue("Mine");
    await button(wrapper, "Save")?.trigger("click");
    expect(
      store.getItem<SavedQuery[]>("comments.savedQueries")?.map((q) => q.label),
    ).toEqual(["Mine"]);
    expect(store.getItem("posts.savedQueries")).toBeUndefined();

    await button(wrapper, /Remove.*Mine/)?.trigger("click");
    expect(store.getItem<SavedQuery[]>("comments.savedQueries")).toEqual([]);
  });

  it("cannot save a blank name", async () => {
    const store = createStore();
    const { wrapper } = mountStub(store, { filter: { title: "draft" } });
    await button(wrapper, "Save current query")?.trigger("click");
    expect(button(wrapper, "Save")?.attributes("disabled")).toBeDefined();
    await wrapper.find('input[aria-label="Query name"]').setValue("   ");
    expect(button(wrapper, "Save")?.attributes("disabled")).toBeDefined();
    await button(wrapper, "Save")?.trigger("click");
    expect(store.getItem("posts.savedQueries")).toBeUndefined();

    await button(wrapper, "Cancel")?.trigger("click");
    expect(wrapper.find('input[aria-label="Query name"]').exists()).toBe(false);
  });

  it("remove deletes only that query from the store", async () => {
    const store = seeded();
    const { wrapper, setParams } = mountStub(store);
    await button(wrapper, /Remove.*Hello posts/)?.trigger("click");
    expect(labels(store)).toEqual(["World posts"]);
    expect(button(wrapper, "Hello posts")).toBeUndefined();
    expect(button(wrapper, "World posts")).toBeDefined();
    expect(setParams).not.toHaveBeenCalled();
  });
});

describe("SavedQueriesList removal", () => {
  it("removing the active query leaves the list params and offers to save again", async () => {
    const { wrapper, setParams } = mountStub(seeded(), {
      filter: { title: "hello" },
      perPage: 10,
    });
    await button(wrapper, /Remove.*Hello posts/)?.trigger("click");
    expect(setParams).not.toHaveBeenCalled();
    expect(button(wrapper, "Hello posts")).toBeUndefined();
    expect(button(wrapper, "Save current query")).toBeDefined();
  });
});

describe("SavedQueriesList under List", () => {
  it("applying a query makes one getList call with its filter", async () => {
    const dataProvider = fakeDataProvider({
      posts: [
        { id: 1, title: "hello" },
        { id: 2, title: "world" },
      ],
    });
    const getList = vi.spyOn(dataProvider, "getList");
    const store = createStore();
    store.setItem<SavedQuery[]>("posts.savedQueries", [
      {
        label: "Only hello",
        value: {
          ...savedValue("hello", 25),
          sort: [{ field: "id", order: "ASC" }],
        },
      },
    ]);
    const Rows = defineComponent({
      setup() {
        const list = useListContext();
        return () =>
          h(
            "ul",
            (list.data ?? []).map((row) => h("li", String(row.title))),
          );
      },
    });
    const wrapper = mountAdmin(
      store,
      () =>
        h(
          List,
          { resource: "posts" },
          { default: () => [h(SavedQueriesList), h(Rows)] },
        ),
      dataProvider,
    );
    await vi.waitFor(() => expect(wrapper.findAll("li")).toHaveLength(2));
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList.mock.calls[0]?.[1]?.filter).toEqual({});

    await button(wrapper, "Only hello")?.trigger("click");
    // The filtered page has rendered, so the fetch has settled.
    await vi.waitFor(() =>
      expect(wrapper.findAll("li").map((li) => li.text())).toEqual(["hello"]),
    );
    expect(button(wrapper, "Only hello")?.attributes("aria-pressed")).toBe(
      "true",
    );
    expect(getList).toHaveBeenCalledTimes(2);
    const params = getList.mock.calls[1]?.[1];
    expect(params?.filter).toEqual({ title: "hello" });
    expect(params?.sort).toEqual({ field: "id", order: "ASC" });
    expect(params?.pagination).toEqual({ page: 1, perPage: 25 });
  });
});
