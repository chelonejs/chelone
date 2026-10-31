/**
 * `useCreate` and `useDataProvider` — mounted through probe components under a
 * real `<Admin>` over a seeded `fakeDataProvider`. Each case asserts what the
 * provider was asked and what the probe's mutation reports.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { useDataProvider } from "../context";
import { useCreate } from "./mutations";
import { useGetList } from "./queries";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

function seededDataProvider() {
  return fakeDataProvider<Resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
  });
}

function mountUnderAdmin(
  dataProvider: ReturnType<typeof seededDataProvider>,
  Probe: Component,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
  return mount(Harness, { global: { plugins: [router] } });
}

describe("useCreate", () => {
  it("mutateAsync creates the record and invalidates the resource's lists", async () => {
    const dataProvider = seededDataProvider();
    const create = vi.spyOn(dataProvider, "create");
    const getList = vi.spyOn(dataProvider, "getList");
    let created: unknown;
    const Probe = defineComponent({
      setup() {
        const list = useGetList<Resources, "posts">("posts");
        const mutation = useCreate<Resources, "posts">("posts");
        return () =>
          h("div", [
            h(
              "span",
              { "data-testid": "titles" },
              list.data.value?.data.map((p) => p.title).join(",") ?? "",
            ),
            h("button", {
              onClick: async () => {
                created = await mutation.mutateAsync({ data: { title: "c" } });
              },
            }),
          ]);
      },
    });
    const wrapper = mountUnderAdmin(dataProvider, Probe);
    await flushPromises();
    expect(wrapper.get("[data-testid=titles]").text()).toBe("a,b");
    expect(getList).toHaveBeenCalledTimes(1);

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(create).toHaveBeenCalledWith("posts", { data: { title: "c" } });
    expect(created).toMatchObject({ title: "c" });
    expect(getList).toHaveBeenCalledTimes(2);
    expect(wrapper.get("[data-testid=titles]").text()).toBe("a,b,c");
  });

  it("a provider error surfaces on error and isPending clears", async () => {
    const dataProvider = seededDataProvider();
    vi.spyOn(dataProvider, "create").mockRejectedValue(new Error("boom"));
    const Probe = defineComponent({
      setup() {
        const mutation = useCreate<Resources, "posts">("posts");
        return () =>
          h("div", [
            h(
              "span",
              { "data-testid": "error" },
              mutation.error.value?.message,
            ),
            h(
              "span",
              { "data-testid": "pending" },
              String(mutation.isPending.value),
            ),
            h("button", {
              onClick: () => mutation.mutate({ data: { title: "c" } }),
            }),
          ]);
      },
    });
    const wrapper = mountUnderAdmin(dataProvider, Probe);
    await flushPromises();

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.get("[data-testid=error]").text()).toBe("boom");
    expect(wrapper.get("[data-testid=pending]").text()).toBe("false");
  });
});

describe("useDataProvider", () => {
  it("returns the data provider Admin was given", async () => {
    const dataProvider = seededDataProvider();
    let seen: unknown;
    const Probe = defineComponent({
      setup() {
        seen = useDataProvider();
        return () => h("div");
      },
    });
    mountUnderAdmin(dataProvider, Probe);
    await flushPromises();
    expect(seen).toBe(dataProvider);
  });
});
