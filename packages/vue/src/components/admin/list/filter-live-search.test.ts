/**
 * `<FilterLiveSearch>`: a search box that writes its text into the ambient
 * list's filter. Mounted under a real `<Admin>` + `<List>`; assertions are on
 * the input and on the list's filter.
 */

import {
  createI18n,
  defineMessages,
  type FilterPayload,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import {
  type ListContextValue,
  useListContext,
} from "../../../list/list-context";
import List from "../view/list.vue";
import FilterLiveSearch from "./filter-live-search.vue";

async function mountSearch(ui: () => VNodeChild) {
  let list: ListContextValue | undefined;
  const probe = defineComponent({
    setup() {
      list = useListContext();
      return () => null;
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/");
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider: fakeDataProvider({ posts: [] }),
          queryClient: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
          i18n: createI18n({
            locale: "en",
            messages: {
              en: defineMessages({ "chelone.action.search": "Search posts" }),
            },
          }),
        },
        {
          default: () =>
            h(List, { resource: "posts" }, { default: () => [h(probe), ui()] }),
        },
      ),
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  await flushPromises();
  return {
    wrapper,
    filter: () => ({ ...list?.filter }),
    setFilters: async (next: FilterPayload) => {
      list?.setFilters(next, {});
      await flushPromises();
    },
  };
}

describe("<FilterLiveSearch>", () => {
  it("typing sets the q filter on the list", async () => {
    const { wrapper, filter } = await mountSearch(() => h(FilterLiveSearch));
    await wrapper.get("input").setValue("abc");
    await vi.waitFor(() => expect(filter()).toEqual({ q: "abc" }), {
      timeout: 2000,
    });
  });

  it("source and placeholder props change the filter key and the hint", async () => {
    const { wrapper, filter } = await mountSearch(() =>
      h(FilterLiveSearch, { source: "title", placeholder: "Find a title" }),
    );
    const input = wrapper.get("input");
    expect(input.attributes("placeholder")).toBe("Find a title");
    await input.setValue("abc");
    await vi.waitFor(() => expect(filter()).toEqual({ title: "abc" }), {
      timeout: 2000,
    });
  });

  it("shows a q filter set elsewhere", async () => {
    const { wrapper, setFilters } = await mountSearch(() =>
      h(FilterLiveSearch),
    );
    const input = wrapper.get("input");
    expect(input.attributes("placeholder")).toBe("Search posts");
    await setFilters({ q: "hello" });
    expect(elementOf(input.element, HTMLInputElement).value).toBe("hello");
    await setFilters({ q: "later" });
    expect(elementOf(input.element, HTMLInputElement).value).toBe("later");
  });
});
