/**
 * `<LockStatus>` mounted under a real `<Admin>` over a `realtimeDataProvider`
 * whose `inMemoryLockProvider` announces on a `memoryTransport`. Cases assert
 * the rendered badge and how often the lock provider was asked.
 */

import {
  defineResources,
  fakeDataProvider,
  inMemoryLockProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import { provideRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import LockStatus from "./lock-status.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  tags: { schema: z.object({ id: z.number(), name: z.string() }) },
});
type Resources = typeof resources;

function setup() {
  const transport = memoryTransport();
  const locks = inMemoryLockProvider({ publisher: transport });
  const dataProvider = realtimeDataProvider(
    fakeDataProvider<Resources>({
      posts: [{ id: 1, title: "a" }],
      tags: [{ id: 1, name: "t" }],
    }),
    transport,
    { locks },
  );
  return { locks, dataProvider };
}

function mountUnderAdmin(
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  render: () => VNode,
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

const text = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('[data-testid="host"]').text();

const inHost = (child: VNode) => h("div", { "data-testid": "host" }, [child]);

describe("<LockStatus>", () => {
  it("shows the holder identity when the record is locked", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(h(LockStatus, { resource: "posts", id: 1 })),
    );
    await flushPromises();

    expect(text(wrapper)).toBe("Locked by ann");
  });

  it("renders nothing when the record is free", async () => {
    const { dataProvider } = setup();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(h(LockStatus, { resource: "posts", id: 1 })),
    );
    await flushPromises();

    expect(text(wrapper)).toBe("");
  });

  it("the free slot renders when the record is free", async () => {
    const { dataProvider } = setup();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(
        h(
          LockStatus,
          { resource: "posts", id: 1 },
          { free: () => h("span", "Available") },
        ),
      ),
    );
    await flushPromises();

    expect(text(wrapper)).toBe("Available");
  });

  it("the lock slot replaces the default badge", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(
        h(
          LockStatus,
          { resource: "posts", id: 1 },
          {
            lock: ({ lock }: { lock: { identity: unknown } }) =>
              h("em", `held by ${String(lock.identity)}`),
          },
        ),
      ),
    );
    await flushPromises();

    expect(text(wrapper)).toBe("held by ann");
    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false);
  });

  it("reads resource and id from the contexts", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const Scope = defineComponent({
      setup() {
        provideResourceContext("posts");
        provideRecordContext({ id: 1, title: "a" });
        return () => inHost(h(LockStatus));
      },
    });
    const wrapper = mountUnderAdmin(dataProvider, () => h(Scope));
    await flushPromises();

    expect(text(wrapper)).toBe("Locked by ann");
  });

  it("updates when the lock is released", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(h(LockStatus, { resource: "posts", id: 1 })),
    );
    await flushPromises();
    expect(text(wrapper)).toBe("Locked by ann");

    await locks.unlock("posts", { id: 1, identity: "ann" });
    await flushPromises();
    expect(text(wrapper)).toBe("");
  });

  it("renders nothing and fetches nothing without a resource or an id", async () => {
    const { dataProvider } = setup();
    const getLock = vi.spyOn(dataProvider, "getLock");
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h("div", [
        inHost(h(LockStatus, { id: 1 }, { free: () => h("span", "free") })),
        inHost(h(LockStatus, { resource: "posts" })),
      ]),
    );
    await flushPromises();

    expect(wrapper.text()).toBe("");
    expect(getLock).not.toHaveBeenCalled();
  });

  it("treats id 0 as an id", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 0, identity: "ann" });
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(h(LockStatus, { resource: "posts", id: 0 })),
    );
    await flushPromises();

    expect(text(wrapper)).toBe("Locked by ann");
  });

  it("follows a resource prop that changes", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const resource = ref<string | undefined>("posts");
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(h(LockStatus, { resource: resource.value, id: 1 })),
    );
    await flushPromises();
    expect(text(wrapper)).toBe("Locked by ann");

    resource.value = "tags";
    await nextTick();
    await flushPromises();
    expect(text(wrapper)).toBe("");
  });

  it("starts fetching once a resource appears", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("tags", { id: 1, identity: "bob" });
    const getLock = vi.spyOn(dataProvider, "getLock");
    const resource = ref<string | undefined>();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      inHost(h(LockStatus, { resource: resource.value, id: 1 })),
    );
    await flushPromises();
    expect(getLock).not.toHaveBeenCalled();

    resource.value = "tags";
    await nextTick();
    await flushPromises();
    expect(getLock).toHaveBeenCalledWith("tags", { id: 1 });
    expect(text(wrapper)).toBe("Locked by bob");
  });
});
