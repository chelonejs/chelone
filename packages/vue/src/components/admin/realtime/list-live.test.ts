/**
 * `<ListLive>` mounted under a real `<Admin>` over a `realtimeDataProvider` on
 * a `memoryTransport`. Cases assert the rendered rows and how often the
 * provider was asked.
 */

import {
  addEventsForMutations,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import DataTable from "../list/data-table.vue";
import DataTableCol from "../list/data-table-col.vue";
import List from "../view/list.vue";
import ListLive from "./list-live.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  tags: { schema: z.object({ id: z.number(), name: z.string() }) },
});
type Resources = typeof resources;

function setup() {
  const transport = memoryTransport();
  const base = fakeDataProvider<Resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
    tags: [{ id: 1, name: "t" }],
  });
  const dataProvider = addEventsForMutations(
    realtimeDataProvider(base, transport),
    transport,
  );
  return { transport, dataProvider };
}

function mountUnderAdmin(
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  render: () => unknown,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: render, layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(Harness, { global: { plugins: [router] } });
}

const table = () =>
  h(DataTable, null, { default: () => h(DataTableCol, { source: "title" }) });

const titles = (wrapper: ReturnType<typeof mountUnderAdmin>) =>
  wrapper.findAll("tbody tr").map((row) => row.text());

describe("<ListLive>", () => {
  it("renders the rows like <List>", async () => {
    const { dataProvider } = setup();
    const live = mountUnderAdmin(dataProvider, () =>
      h(ListLive, { resource: "posts" }, { default: table }),
    );
    const plain = mountUnderAdmin(dataProvider, () =>
      h(List, { resource: "posts" }, { default: table }),
    );
    await flushPromises();

    expect(titles(live)).toEqual(["a", "b"]);
    expect(live.find('[data-slot="list"]').html()).toBe(
      plain.find('[data-slot="list"]').html(),
    );
  });

  it("shows a created record after an event on the resource topic", async () => {
    const { dataProvider } = setup();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(ListLive, { resource: "posts" }, { default: table }),
    );
    await flushPromises();

    await dataProvider.create("posts", { data: { title: "c" } });
    await flushPromises();

    expect(titles(wrapper)).toEqual(["a", "b", "c"]);
  });

  it("refetches after a reconnect", async () => {
    const { transport, dataProvider } = setup();
    const getList = vi.spyOn(dataProvider, "getList");
    mountUnderAdmin(dataProvider, () =>
      h(ListLive, { resource: "posts" }, { default: table }),
    );
    await flushPromises();
    expect(getList).toHaveBeenCalledTimes(1);

    transport.simulateReconnect();
    await flushPromises();

    expect(getList).toHaveBeenCalledTimes(2);
  });

  it("ignores events of another resource and stops on unmount", async () => {
    const { transport, dataProvider } = setup();
    const getList = vi.spyOn(dataProvider, "getList");
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(ListLive, { resource: "posts" }, { default: table }),
    );
    await flushPromises();

    await dataProvider.create("tags", { data: { name: "u" } });
    await flushPromises();
    expect(getList).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    await dataProvider.create("posts", { data: { title: "c" } });
    transport.simulateReconnect();
    await flushPromises();
    expect(getList).toHaveBeenCalledTimes(1);
  });

  it("passes the actions slot through", async () => {
    const { dataProvider } = setup();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(
        ListLive,
        { resource: "posts", title: "Live posts" },
        {
          default: table,
          actions: () => h("button", { type: "button" }, "Export"),
        },
      ),
    );
    await flushPromises();

    expect(wrapper.find("h2").text()).toBe("Live posts");
    expect(wrapper.find("button").text()).toBe("Export");
  });
});
