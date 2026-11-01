/**
 * `<LockOnMount>` mounted under a real `<Admin>` over a `realtimeDataProvider`
 * whose `inMemoryLockProvider` announces on a `memoryTransport`. Cases assert
 * the rendered content and what the lock provider holds.
 */

import {
  defineResources,
  fakeDataProvider,
  inMemoryLockProvider,
  type LockProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import LockOnMount from "./lock-on-mount.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

function setup(wrap?: (locks: LockProvider) => LockProvider) {
  const transport = memoryTransport();
  const inMemory = inMemoryLockProvider({ publisher: transport });
  const dataProvider = realtimeDataProvider(
    fakeDataProvider<Resources>({ posts: [{ id: 1, title: "a" }] }),
    transport,
    { locks: wrap ? wrap(inMemory) : inMemory },
  );
  return { locks: inMemory, dataProvider };
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

const children = { default: () => h("p", { "data-testid": "form" }, "form") };
const lockProps = { resource: "posts", id: 1, identity: "bob" };

describe("<LockOnMount>", () => {
  it("shows the loading slot while the lock is requested", async () => {
    const { dataProvider } = setup();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(LockOnMount, lockProps, {
        ...children,
        loading: () => h("p", { "data-testid": "loading" }, "wait"),
      }),
    );

    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="form"]').exists()).toBe(false);
    await flushPromises();
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false);
  });

  it("renders the default slot once the lock is held", async () => {
    const { dataProvider, locks } = setup();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(LockOnMount, lockProps, children),
    );
    await flushPromises();

    expect(wrapper.find('[data-testid="form"]').exists()).toBe(true);
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "bob",
    });
  });

  it("shows who holds the lock when another identity has it", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(LockOnMount, lockProps, children),
    );
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe("Locked by ann");
    expect(wrapper.find('[data-testid="form"]').exists()).toBe(false);
  });

  it("the locked-by slot replaces the default alert", async () => {
    const { dataProvider, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(LockOnMount, lockProps, {
        ...children,
        "locked-by": ({ lock }: { lock: { identity: unknown } }) =>
          h(
            "p",
            { "data-testid": "custom" },
            `held by ${String(lock.identity)}`,
          ),
      }),
    );
    await flushPromises();

    expect(wrapper.find('[data-testid="custom"]').text()).toBe("held by ann");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("releases the lock on unmount", async () => {
    const { dataProvider, locks } = setup();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(LockOnMount, lockProps, children),
    );
    await flushPromises();
    expect(await locks.getLock("posts", { id: 1 })).not.toBeNull();

    wrapper.unmount();
    await flushPromises();
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("renders nothing and calls onLockError on a non-conflict error", async () => {
    const { dataProvider } = setup((inMemory) => ({
      ...inMemory,
      lock: async () => {
        throw new Error("boom");
      },
    }));
    const onLockError = vi.fn();
    const wrapper = mountUnderAdmin(dataProvider, () =>
      h(LockOnMount, { ...lockProps, onLockError }, children),
    );
    await flushPromises();

    expect(wrapper.find('[data-testid="form"]').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(onLockError).toHaveBeenCalledTimes(1);
    expect(onLockError.mock.calls[0]?.[0]).toMatchObject({ message: "boom" });
  });
});
