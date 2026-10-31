/**
 * `<FilterList>`, `<FilterListSection>` and `<FilterListItem>`: one-click list
 * filters in a sidebar. Mounted under a real `<Admin>` + `<List>`; assertions
 * are on DOM, roles and the list's filter.
 */

import {
  createI18n,
  defineMessages,
  type FilterPayload,
  fakeDataProvider,
} from "@chelone/core";
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
import FilterList from "./filter-list.vue";
import FilterListItem from "./filter-list-item.vue";
import FilterListSection from "./filter-list-section.vue";

async function mountFilters(
  ui: () => VNodeChild,
  { messages = {} }: { messages?: Record<string, string> } = {},
) {
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
            messages: { en: defineMessages(messages) },
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
  const filter = () => ({ ...list?.filter });
  const setFilters = async (next: FilterPayload) => {
    list?.setFilters(next, {});
    await flushPromises();
  };
  return { wrapper, filter, setFilters };
}

const toggleButton = (wrapper: ReturnType<typeof mount>, name: string) => {
  const found = wrapper
    .findAll("button")
    .find((b) => b.attributes("aria-label") === undefined && b.text() === name);
  if (!found) throw new Error(`no toggle button named ${name}`);
  return found;
};
const clearButtons = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('button[aria-label="Remove filter"]');

describe("<FilterListItem>", () => {
  it("clicking an unselected item sets its value as the list filter", async () => {
    const { wrapper, filter, setFilters } = await mountFilters(() =>
      h("ul", [
        h(FilterListItem, { label: "Draft", value: { status: "draft" } }),
      ]),
    );
    await setFilters({ q: "x" });
    const toggle = toggleButton(wrapper, "Draft");
    expect(toggle.attributes("aria-pressed")).toBe("false");
    await toggle.trigger("click");
    await flushPromises();
    expect(filter()).toEqual({ q: "x", status: "draft" });
  });

  it("clicking a selected item removes only its keys", async () => {
    const { wrapper, filter, setFilters } = await mountFilters(() =>
      h("ul", [
        h(FilterListItem, { label: "Draft", value: { status: "draft" } }),
      ]),
    );
    await setFilters({ q: "x", status: "draft" });
    await toggleButton(wrapper, "Draft").trigger("click");
    await flushPromises();
    expect(filter()).toEqual({ q: "x" });
  });

  it("a selected item is aria-pressed and its clear control is not inside the toggle button", async () => {
    const { wrapper, filter, setFilters } = await mountFilters(() =>
      h("ul", [
        h(FilterListItem, { label: "Draft", value: { status: "draft" } }),
        h(FilterListItem, { label: "Live", value: { status: "live" } }),
      ]),
    );
    await setFilters({ status: "draft" });
    const toggle = toggleButton(wrapper, "Draft");
    expect(toggle.attributes("aria-pressed")).toBe("true");
    expect(toggle.attributes("data-selected")).toBe("true");
    const li = toggle.element.closest("li");
    expect(li?.classList).toContain("filter-list-item-selected");
    const clear = clearButtons(wrapper);
    // only the selected item has a clear control
    expect(clear).toHaveLength(1);
    expect(toggle.element.contains(clear[0]?.element ?? null)).toBe(false);
    expect(clear[0]?.element.closest("li")).toBe(li);
    expect(toggleButton(wrapper, "Live").attributes("aria-pressed")).toBe(
      "false",
    );
    await clear[0]?.trigger("click");
    await flushPromises();
    expect(filter()).toEqual({});
  });

  it("isSelected and toggleFilter props replace the defaults", async () => {
    const isSelected = vi.fn(() => true);
    const toggleFilter = vi.fn(() => ({ custom: 1 }));
    const { wrapper, filter, setFilters } = await mountFilters(() =>
      h("ul", [
        h(FilterListItem, {
          label: "Draft",
          value: { status: "draft" },
          isSelected,
          toggleFilter,
        }),
      ]),
    );
    await setFilters({ q: "x" });
    expect(isSelected).toHaveBeenCalledWith({ status: "draft" }, { q: "x" });
    expect(toggleButton(wrapper, "Draft").attributes("aria-pressed")).toBe(
      "true",
    );
    await toggleButton(wrapper, "Draft").trigger("click");
    await flushPromises();
    expect(toggleFilter).toHaveBeenCalledWith({ status: "draft" }, { q: "x" });
    expect(filter()).toEqual({ custom: 1 });
  });

  it("a string label is translated with itself as the fallback", async () => {
    const { wrapper } = await mountFilters(
      () =>
        h("ul", [
          h(FilterListItem, {
            label: "filters.draft",
            value: { status: "draft" },
          }),
          h(FilterListItem, { label: "Live", value: { status: "live" } }),
        ]),
      { messages: { "filters.draft": "Brouillon" } },
    );
    expect(toggleButton(wrapper, "Brouillon")).toBeTruthy();
    expect(toggleButton(wrapper, "Live")).toBeTruthy();
  });

  it("the icon and label slots override the icon prop and the translated label", async () => {
    const { wrapper } = await mountFilters(() =>
      h("ul", [
        h(
          FilterListItem,
          { label: "Draft", value: { status: "draft" } },
          {
            icon: () => h("svg", { "data-testid": "icon" }),
            label: () => h("em", { "data-testid": "el" }, "Archived"),
          },
        ),
      ]),
    );
    const toggle = wrapper.find('[data-testid="el"]').element.closest("button");
    expect(toggle).toBeTruthy();
    expect(toggle?.textContent).toBe("Archived");
    expect(toggle?.querySelector('[data-testid="icon"]')).toBeTruthy();
  });

  it("the item follows a filter changed elsewhere", async () => {
    const { wrapper, setFilters } = await mountFilters(() =>
      h("ul", [
        h(FilterListItem, { label: "Draft", value: { status: "draft" } }),
      ]),
    );
    expect(toggleButton(wrapper, "Draft").attributes("aria-pressed")).toBe(
      "false",
    );
    expect(clearButtons(wrapper)).toHaveLength(0);
    await setFilters({ status: "draft" });
    expect(toggleButton(wrapper, "Draft").attributes("aria-pressed")).toBe(
      "true",
    );
    expect(clearButtons(wrapper)).toHaveLength(1);
    await setFilters({});
    expect(toggleButton(wrapper, "Draft").attributes("aria-pressed")).toBe(
      "false",
    );
    expect(clearButtons(wrapper)).toHaveLength(0);
  });
});

describe("<FilterList>", () => {
  it("renders the translated label, the icon slot and its items in a list", async () => {
    const { wrapper } = await mountFilters(
      () =>
        h(
          FilterList,
          { label: "filters.status" },
          {
            icon: () => h("svg", { "data-testid": "icon" }),
            default: () => [
              h(FilterListItem, { label: "Draft", value: { status: "draft" } }),
              h(FilterListItem, { label: "Live", value: { status: "live" } }),
            ],
          },
        ),
      { messages: { "filters.status": "Statut" } },
    );
    expect(wrapper.text()).toContain("Statut");
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true);
    const list = wrapper.find('[data-slot="filter-list-section"] ul');
    expect(list.findAll("li")).toHaveLength(2);
    expect(list.text()).toContain("Draft");
    expect(list.text()).toContain("Live");
  });
});

describe("<FilterListSection>", () => {
  it("renders its default slot without a list", async () => {
    const { wrapper } = await mountFilters(() =>
      h(
        FilterListSection,
        { label: "Status" },
        { default: () => h("p", "custom content") },
      ),
    );
    const section = wrapper.find('[data-slot="filter-list-section"]');
    expect(section.text()).toContain("Status");
    expect(section.text()).toContain("custom content");
    expect(section.find("ul").exists()).toBe(false);
  });
});
