/**
 * The live read composables, mounted through probe components under a real
 * `<Admin>` over a `realtimeDataProvider` on a `memoryTransport`. Each case
 * asserts what the probe renders and how often the provider was asked.
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
import { type Component, defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { useGetListLive, useGetManyLive, useGetOneLive } from "./live";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

function setup() {
  const transport = memoryTransport();
  const base = fakeDataProvider<Resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
      { id: 3, title: "c" },
    ],
  });
  const dataProvider = addEventsForMutations(
    realtimeDataProvider(base, transport),
    transport,
  );
  return { transport, dataProvider };
}

function mountUnderAdmin(
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  probe: Component,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: () => h(probe), layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(Harness, { global: { plugins: [router] } });
}

const event = (type: string) => ({ type, payload: null });

describe("useGetListLive", () => {
  function mountList(
    dataProvider: ReturnType<typeof setup>["dataProvider"],
    options: { enabled?: boolean } = {},
  ) {
    return mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const list = useGetListLive<Resources, "posts">("posts", {}, options);
          return () =>
            h(
              "ul",
              (list.data.value?.data ?? []).map((post) =>
                h("li", { key: post.id }, post.title),
              ),
            );
        },
      }),
    );
  }

  it("returns the list and refetches when a created event arrives", async () => {
    const { transport, dataProvider } = setup();
    const wrapper = mountList(dataProvider);
    await flushPromises();
    expect(wrapper.findAll("li").map((li) => li.text())).toEqual([
      "a",
      "b",
      "c",
    ]);

    await dataProvider.create("posts", { data: { title: "d" } });
    await flushPromises();

    expect(wrapper.findAll("li").map((li) => li.text())).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(transport.publishedEvents.map((e) => e.topic)).toContain(
      "resource/posts",
    );
  });

  it("refetches after a reconnect and stops on unmount", async () => {
    const { transport, dataProvider } = setup();
    const getList = vi.spyOn(dataProvider, "getList");
    const wrapper = mountList(dataProvider);
    await flushPromises();
    expect(getList).toHaveBeenCalledTimes(1);

    transport.simulateReconnect();
    await flushPromises();
    expect(getList).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    transport.simulateReconnect();
    await transport.publish("resource/posts", event("created"));
    await flushPromises();
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it("does not subscribe when enabled is false", async () => {
    const { transport, dataProvider } = setup();
    const subscribe = vi.spyOn(dataProvider, "subscribe");
    const getList = vi.spyOn(dataProvider, "getList");
    mountList(dataProvider, { enabled: false });
    await flushPromises();

    await transport.publish("resource/posts", event("created"));
    await flushPromises();

    expect(subscribe).not.toHaveBeenCalled();
    expect(getList).not.toHaveBeenCalled();
  });
});

describe("useGetOneLive", () => {
  function mountOne(
    dataProvider: ReturnType<typeof setup>["dataProvider"],
    id: { value: number },
  ) {
    return mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const one = useGetOneLive<Resources, "posts">("posts", () => ({
            id: id.value,
          }));
          return () => h("p", one.data.value?.title ?? "");
        },
      }),
    );
  }

  it("refetches when its record changes and ignores other records", async () => {
    const { transport, dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const wrapper = mountOne(dataProvider, { value: 1 });
    await flushPromises();
    expect(wrapper.text()).toBe("a");

    await transport.publish("resource/posts/2", event("updated"));
    await flushPromises();
    expect(getOne).toHaveBeenCalledTimes(1);

    await dataProvider.update("posts", {
      id: 1,
      data: { title: "a2" },
      previousData: { id: 1, title: "a" },
    });
    await flushPromises();

    expect(wrapper.text()).toBe("a2");
  });

  it("follows a reactive id", async () => {
    const { transport, dataProvider } = setup();
    const id = ref(1);
    const wrapper = mountOne(dataProvider, id);
    await flushPromises();
    expect(wrapper.text()).toBe("a");

    id.value = 2;
    await flushPromises();
    expect(wrapper.text()).toBe("b");

    const getOne = vi.spyOn(dataProvider, "getOne");
    await transport.publish("resource/posts/1", event("updated"));
    await flushPromises();
    expect(getOne).not.toHaveBeenCalled();

    await transport.publish("resource/posts/2", event("updated"));
    await flushPromises();
    expect(getOne).toHaveBeenCalledTimes(1);
  });
});

describe("useGetManyLive", () => {
  function mountMany(
    dataProvider: ReturnType<typeof setup>["dataProvider"],
    ids: () => number[],
  ) {
    return mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const many = useGetManyLive<Resources, "posts">("posts", () => ({
            ids: ids(),
          }));
          return () =>
            h("p", (many.data.value ?? []).map((p) => p.title).join());
        },
      }),
    );
  }

  it("refetches when any listed record changes", async () => {
    const { transport, dataProvider } = setup();
    const getMany = vi.spyOn(dataProvider, "getMany");
    mountMany(dataProvider, () => [1, 2]);
    await flushPromises();
    expect(getMany).toHaveBeenCalledTimes(1);

    await transport.publish("resource/posts/2", event("updated"));
    await flushPromises();
    expect(getMany).toHaveBeenCalledTimes(2);

    await transport.publish("resource/posts/3", event("updated"));
    await flushPromises();
    expect(getMany).toHaveBeenCalledTimes(2);
  });

  it("does not resubscribe when a new array holds the same ids", async () => {
    const { dataProvider } = setup();
    const subscribe = vi.spyOn(dataProvider, "subscribe");
    const tick = ref(0);
    mountMany(dataProvider, () => {
      void tick.value;
      return tick.value % 2 === 0 ? [1, 2] : [2, 1];
    });
    await flushPromises();
    const subscribed = subscribe.mock.calls.length;
    expect(subscribed).toBeGreaterThan(0);

    tick.value = 1;
    await nextTick();
    await flushPromises();

    expect(subscribe).toHaveBeenCalledTimes(subscribed);
  });

  it("refetches after updateMany through addEventsForMutations", async () => {
    const { dataProvider } = setup();
    const wrapper = mountMany(dataProvider, () => [1, 2]);
    await flushPromises();
    expect(wrapper.text()).toBe("a,b");

    await dataProvider.updateMany("posts", { ids: [2], data: { title: "b2" } });
    await flushPromises();

    expect(wrapper.text()).toBe("a,b2");
  });
});
