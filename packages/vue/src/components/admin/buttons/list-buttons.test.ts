/**
 * Tests: list-level buttons — `<ToggleFilterButton>`, `<SelectAllButton>` and
 * `<RefreshIconButton>`, mounted under a real `<Admin>` + `<List>` so the
 * ambient `ListContext` is live. A probe captures the list so assertions read
 * its filter and selection plus the data provider's calls.
 */

import {
  createI18n,
  defineMessages,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import {
  type ListContextValue,
  useListContext,
} from "../../../list/list-context";
import List from "../view/list.vue";
import RefreshIconButton from "./refresh-icon-button.vue";
import SelectAllButton from "./select-all-button.vue";
import ToggleFilterButton from "./toggle-filter-button.vue";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      category: z.string(),
    }),
  },
});
type Resources = typeof resources;

const seed = [
  { id: 1, title: "One", category: "news" },
  { id: 2, title: "Two", category: "news" },
  { id: 3, title: "Three", category: "misc" },
  { id: 4, title: "Four", category: "misc" },
  { id: 5, title: "Five", category: "misc" },
];

const makeI18n = () =>
  createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.refresh": "Refresh",
        "chelone.action.select_all": "Select all",
        "app.reload": "Reload the data",
        "app.news": "Latest news",
      }),
    },
  });

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
}

type Capture = { list?: ListContextValue };

function mountList(
  buttons: () => VNodeChild[],
  { perPage = 2 }: { perPage?: number } = {},
) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const capture: Capture = {};
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
          { dataProvider, queryClient, i18n: makeI18n() },
          {
            default: () =>
              h(
                List,
                { resource: "posts", perPage },
                { default: () => [h(probe), ...buttons()] },
              ),
          },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [makeRouter()] } });
  return { wrapper, dataProvider, capture };
}

const settled = (capture: Capture) =>
  vi.waitFor(() => expect(capture.list?.isPending).toBe(false));

describe("<ToggleFilterButton>", () => {
  it("clicking sets its value as the list filter and clicking again removes it", async () => {
    const { wrapper, capture } = mountList(() => [
      h(ToggleFilterButton, { label: "News", value: { category: "news" } }),
    ]);
    await settled(capture);
    expect(capture.list?.filter).toEqual({});

    await wrapper.get('[data-slot="toggle-filter-button"]').trigger("click");
    await vi.waitFor(() =>
      expect(capture.list?.filter).toEqual({ category: "news" }),
    );

    await wrapper.get('[data-slot="toggle-filter-button"]').trigger("click");
    await vi.waitFor(() => expect(capture.list?.filter).toEqual({}));
  });

  it("is aria-pressed while its value is in the filter and keeps other filters on toggle", async () => {
    const { wrapper, capture } = mountList(() => [
      h(ToggleFilterButton, { label: "News", value: { category: "news" } }),
      h(ToggleFilterButton, { label: "Mine", value: { author: "me" } }),
    ]);
    await settled(capture);
    const [news, mine] = wrapper.findAll('[data-slot="toggle-filter-button"]');
    expect(news?.attributes("aria-pressed")).toBe("false");

    await mine?.trigger("click");
    await vi.waitFor(() =>
      expect(mine?.attributes("aria-pressed")).toBe("true"),
    );
    await news?.trigger("click");
    await vi.waitFor(() =>
      expect(news?.attributes("aria-pressed")).toBe("true"),
    );
    expect(capture.list?.filter).toEqual({ author: "me", category: "news" });

    await news?.trigger("click");
    await vi.waitFor(() =>
      expect(news?.attributes("aria-pressed")).toBe("false"),
    );
    expect(mine?.attributes("aria-pressed")).toBe("true");
    expect(capture.list?.filter).toEqual({ author: "me" });
  });

  it("translates a string label with itself as the fallback", async () => {
    const { wrapper, capture } = mountList(() => [
      h(ToggleFilterButton, { label: "app.news", value: { category: "news" } }),
      h(ToggleFilterButton, {
        label: "Plain text",
        value: { category: "misc" },
      }),
    ]);
    await settled(capture);
    const texts = wrapper
      .findAll('[data-slot="toggle-filter-button"]')
      .map((b) => b.text());
    expect(texts).toEqual(["Latest news", "Plain text"]);
  });

  it("renders its default slot in place of the label", async () => {
    const { wrapper, capture } = mountList(() => [
      h(
        ToggleFilterButton,
        { value: { category: "news" } },
        { default: () => h("em", "Custom") },
      ),
    ]);
    await settled(capture);
    expect(wrapper.get('[data-slot="toggle-filter-button"] em').text()).toBe(
      "Custom",
    );
  });
});

describe("<SelectAllButton>", () => {
  it("selects up to the limit across pages and emits click afterwards", async () => {
    const onClick = vi.fn();
    const { wrapper, capture, dataProvider } = mountList(() => [
      h(SelectAllButton, { limit: 4, onClick }),
    ]);
    await settled(capture);
    capture.list?.select([1, 2]);
    const spy = vi.spyOn(dataProvider, "getList");
    const button = await vi.waitFor(() => {
      const found = wrapper.find('[data-slot="select-all-button"]');
      expect(found.exists()).toBe(true);
      return found;
    });
    expect(button.text()).toBe("Select all");

    await button.trigger("click");

    await vi.waitFor(() =>
      expect(capture.list?.selectedIds).toEqual([1, 2, 3, 4]),
    );
    expect(
      spy.mock.calls.some(
        ([, params]) =>
          params.pagination !== undefined &&
          "perPage" in params.pagination &&
          params.pagination.perPage === 4,
      ),
    ).toBe(true);
    await vi.waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it("is hidden until every row of the page is selected", async () => {
    const { wrapper, capture } = mountList(() => [h(SelectAllButton)]);
    await settled(capture);
    capture.list?.select([1]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1]));
    expect(wrapper.find('[data-slot="select-all-button"]').exists()).toBe(
      false,
    );

    capture.list?.toggleItem(2);
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="select-all-button"]').exists()).toBe(
        true,
      ),
    );
  });

  it("is hidden once everything or the limit is selected", async () => {
    const everything = mountList(() => [h(SelectAllButton)], { perPage: 10 });
    await settled(everything.capture);
    everything.capture.list?.select([1, 2, 3, 4, 5]);
    await vi.waitFor(() =>
      expect(everything.capture.list?.selectedIds).toHaveLength(5),
    );
    expect(
      everything.wrapper.find('[data-slot="select-all-button"]').exists(),
    ).toBe(false);
    everything.wrapper.unmount();

    const limited = mountList(() => [h(SelectAllButton, { limit: 2 })]);
    await settled(limited.capture);
    limited.capture.list?.select([1, 2]);
    await vi.waitFor(() =>
      expect(limited.capture.list?.selectedIds).toEqual([1, 2]),
    );
    expect(
      limited.wrapper.find('[data-slot="select-all-button"]').exists(),
    ).toBe(false);
  });

  it("is hidden while the list has no data", async () => {
    const dataProvider = fakeDataProvider<Resources>({
      posts: structuredClone(seed),
    });
    const spy = vi
      .spyOn(dataProvider, "getList")
      .mockImplementation(() => new Promise(() => {}));
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            {
              dataProvider,
              queryClient: new QueryClient(),
              i18n: makeI18n(),
            },
            {
              default: () =>
                h(
                  List,
                  { resource: "posts" },
                  { default: () => h(SelectAllButton) },
                ),
            },
          );
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [makeRouter()] } });
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(wrapper.find('[data-slot="select-all-button"]').exists()).toBe(
      false,
    );
  });
});

describe("<RefreshIconButton>", () => {
  it("clicking invalidates every query and emits click", async () => {
    const onClick = vi.fn();
    const { wrapper, capture, dataProvider } = mountList(() => [
      h(RefreshIconButton, { onClick }),
    ]);
    await settled(capture);
    const spy = vi.spyOn(dataProvider, "getList");

    await wrapper.get('[data-slot="refresh-icon-button"]').trigger("click");

    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("its accessible name and title are the translated label", async () => {
    const { wrapper, capture } = mountList(() => [h(RefreshIconButton)]);
    await settled(capture);
    const button = wrapper.get('[data-slot="refresh-icon-button"]');
    expect(button.attributes("aria-label")).toBe("Refresh");
    expect(button.attributes("title")).toBe("Refresh");
  });

  it("a custom label key is translated with itself as the fallback", async () => {
    const { wrapper, capture } = mountList(() => [
      h(RefreshIconButton, { label: "app.reload" }),
      h(RefreshIconButton, { label: "app.unknown" }),
    ]);
    await settled(capture);
    const [known, unknown] = wrapper.findAll(
      '[data-slot="refresh-icon-button"]',
    );
    expect(known?.attributes("aria-label")).toBe("Reload the data");
    expect(known?.attributes("title")).toBe("Reload the data");
    expect(unknown?.attributes("aria-label")).toBe("app.unknown");
    expect(unknown?.attributes("title")).toBe("app.unknown");
  });
});
