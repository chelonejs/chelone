/**
 * `<ShowLive>` mounted under a real `<Admin>` over a `realtimeDataProvider` on
 * a `memoryTransport`. Cases assert the rendered field and how often the
 * provider was asked for the record.
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
import TextField from "../fields/text-field.vue";
import Show from "../view/show.vue";
import ShowLive from "./show-live.vue";

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
    ],
  });
  const dataProvider = addEventsForMutations(
    realtimeDataProvider(base, transport),
    transport,
  );
  return { transport, dataProvider };
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/posts/:id/show", component: { render: () => null } },
    ],
  });
}

function mountUnderAdmin(
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  render: () => unknown,
  router = makeRouter(),
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
  return mount(Harness, { global: { plugins: [router] } });
}

const fields = () => h(TextField, { source: "title" });
const showLive = (props: Record<string, unknown> = {}) =>
  h(ShowLive, { resource: "posts", id: 1, ...props }, { default: fields });

const rename = (
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  id: number,
  title: string,
) =>
  dataProvider.update("posts", {
    id,
    data: { title },
    previousData: { id, title: "" },
  });

describe("<ShowLive>", () => {
  it("renders the record fields like <Show>", async () => {
    const { dataProvider } = setup();
    const live = mountUnderAdmin(dataProvider, () => showLive());
    const plain = mountUnderAdmin(dataProvider, () =>
      h(Show, { resource: "posts", id: 1 }, { default: fields }),
    );
    await flushPromises();

    expect(live.find('[data-slot="show"]').text()).toContain("a");
    expect(live.find('[data-slot="show"]').html()).toBe(
      plain.find('[data-slot="show"]').html(),
    );
  });

  it("shows the new value after an event on the record topic", async () => {
    const { dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const wrapper = mountUnderAdmin(dataProvider, () => showLive());
    await flushPromises();

    await rename(dataProvider, 2, "b2");
    await flushPromises();
    expect(getOne).toHaveBeenCalledTimes(1);

    await rename(dataProvider, 1, "a2");
    await flushPromises();

    expect(wrapper.find('[data-slot="show"]').text()).toContain("a2");
  });

  it("hears an event that lands before the record has loaded", async () => {
    const { dataProvider } = setup();
    // The body renders only once the record is there, so a subscription made
    // inside it would never hear an event while the first load has failed.
    vi.spyOn(dataProvider, "getOne").mockRejectedValueOnce(new Error("down"));
    const wrapper = mountUnderAdmin(dataProvider, () => showLive());
    await flushPromises();
    expect(wrapper.find('[data-slot="show"]').text()).not.toContain("a");

    await rename(dataProvider, 1, "a2");
    await flushPromises();

    expect(wrapper.find('[data-slot="show"]').text()).toContain("a2");
  });

  it("refetches after a reconnect", async () => {
    const { transport, dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    mountUnderAdmin(dataProvider, () => showLive());
    await flushPromises();
    expect(getOne).toHaveBeenCalledTimes(1);

    transport.simulateReconnect();
    await flushPromises();

    expect(getOne).toHaveBeenCalledTimes(2);
  });

  it("takes the id from the id prop over the route param", async () => {
    const { transport, dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const router = makeRouter();
    await router.push("/posts/2/show");
    const wrapper = mountUnderAdmin(
      dataProvider,
      () => showLive({ id: 1 }),
      router,
    );
    await flushPromises();
    expect(wrapper.find('[data-slot="show"]').text()).toContain("a");

    await transport.publish("resource/posts/2", {
      type: "updated",
      payload: null,
    });
    await flushPromises();
    expect(getOne).toHaveBeenCalledTimes(1);

    await rename(dataProvider, 1, "a2");
    await flushPromises();
    expect(wrapper.find('[data-slot="show"]').text()).toContain("a2");
  });

  it("keeps listening to the record it opened on when the route id changes", async () => {
    const { dataProvider } = setup();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const router = makeRouter();
    await router.push("/posts/1/show");
    const wrapper = mountUnderAdmin(
      dataProvider,
      () => h(ShowLive, { resource: "posts" }, { default: fields }),
      router,
    );
    await flushPromises();
    expect(wrapper.find('[data-slot="show"]').text()).toContain("a");

    // <Show> reads its id once, so the page stays on record 1.
    await router.push("/posts/2/show");
    await flushPromises();
    await rename(dataProvider, 2, "b2");
    await flushPromises();
    expect(getOne).toHaveBeenCalledTimes(1);

    await rename(dataProvider, 1, "a2");
    await flushPromises();
    expect(wrapper.find('[data-slot="show"]').text()).toContain("a2");
  });
});
