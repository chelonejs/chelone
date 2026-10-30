/**
 * `useInfiniteGetList` mounted through a probe component under a real
 * `<Admin>` over a seeded `fakeDataProvider`. Each case asserts what the probe
 * renders and what the provider was asked.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { useInfiniteGetList } from "./infinite-queries";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

// 25 rows: pages of 10, 10 and 5.
const rows = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

const mounted: Array<{ wrapper: VueWrapper; queryClient: QueryClient }> = [];

afterEach(() => {
  for (const { wrapper, queryClient } of mounted.splice(0)) {
    wrapper.unmount();
    queryClient.clear();
  }
});

function mountProbe(options: { enabled?: Ref<boolean> } = {}) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(rows),
  });
  const getList = vi.spyOn(dataProvider, "getList");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Probe = defineComponent({
    setup() {
      const query = useInfiniteGetList<Resources, "posts">(
        "posts",
        () => ({ pagination: { page: 1, perPage: 10 } }),
        { enabled: options.enabled },
      );
      return () =>
        h("div", [
          h(
            "p",
            { "data-testid": "pages" },
            String(query.data.value?.pages.length ?? 0),
          ),
          h(
            "p",
            { "data-testid": "has-next" },
            String(query.hasNextPage.value),
          ),
          h("button", { onClick: () => query.fetchNextPage() }, "more"),
          h(
            "ul",
            (query.data.value?.pages ?? [])
              .flatMap((page) => page.data)
              .map((row) => h("li", { key: row.id }, row.title)),
          ),
        ]);
    },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: () => h(Probe), layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  mounted.push({ wrapper, queryClient });
  const titles = () => wrapper.findAll("li").map((li) => li.text());
  return { wrapper, titles, getList };
}

describe("useInfiniteGetList", () => {
  it("useInfiniteGetList loads page 1 and fetchNextPage appends page 2", async () => {
    const { wrapper, titles, getList } = mountProbe();
    await vi.waitFor(() => expect(titles()).toHaveLength(10));
    expect(wrapper.get('[data-testid="has-next"]').text()).toBe("true");
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList).toHaveBeenLastCalledWith(
      "posts",
      expect.objectContaining({ pagination: { page: 1, perPage: 10 } }),
    );

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(titles()).toHaveLength(20));
    expect(titles()[10]).toBe("t11");
    expect(wrapper.get('[data-testid="pages"]').text()).toBe("2");
    expect(getList).toHaveBeenCalledTimes(2);
    expect(getList).toHaveBeenLastCalledWith(
      "posts",
      expect.objectContaining({ pagination: { page: 2, perPage: 10 } }),
    );
  });

  it("useInfiniteGetList hasNextPage is false after the last page and fetchNextPage calls the provider no more", async () => {
    const { wrapper, titles, getList } = mountProbe();
    await vi.waitFor(() => expect(titles()).toHaveLength(10));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(titles()).toHaveLength(20));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(titles()).toHaveLength(25));
    expect(wrapper.get('[data-testid="has-next"]').text()).toBe("false");

    getList.mockClear();
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(getList).not.toHaveBeenCalled();
    expect(titles()).toHaveLength(25);
  });

  it("useInfiniteGetList does not fetch while enabled is false", async () => {
    const enabled = ref(false);
    const { titles, getList } = mountProbe({ enabled });
    await flushPromises();
    expect(getList).not.toHaveBeenCalled();
    expect(titles()).toEqual([]);
    enabled.value = true;
    await vi.waitFor(() => expect(titles()).toHaveLength(10));
    expect(getList).toHaveBeenCalledTimes(1);
  });
});
