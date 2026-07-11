/**
 * R3 probe (vue): mode NON-REGRESSION + `beforeunload` commit guard.
 *
 * The Vue twin of the react probe. Locks the invariants the undoable work must
 * NOT have regressed:
 * - a PESSIMISTIC (default) mutation calls the server IMMEDIATELY, exactly once;
 * - an OPTIMISTIC mutation patches the cache synchronously AND calls the server
 *   exactly once (no deferral, no Undo);
 * - the `<Notification>` `beforeunload` guard commits a still-pending undoable so
 *   the server is never left behind the optimistic cache — asserted via the
 *   dataProvider spy (called once) and the pending-undoable registry draining.
 *
 * Every server-facing assertion checks an explicit SPY COUNT.
 */

import {
  commitAllUndoables,
  createNotificationStore,
  defineResources,
  fakeDataProvider,
  hasPendingUndoables,
  type NotificationStore,
  oneKey,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "./admin/admin.vue";
import Notification from "./components/admin/feedback/notification.vue";
import { useDelete, useUpdate } from "./data/mutations";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type Resources = typeof resources;
interface Post {
  id: number;
  title: string;
  views: number;
}

const seed: Post[] = [
  { id: 1, title: "One", views: 10 },
  { id: 2, title: "Two", views: 20 },
];

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
}

function mountAdmin(
  render: () => VNodeChild,
  notifications: NotificationStore,
  seedCache?: (qc: QueryClient) => void,
) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  seedCache?.(queryClient);
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient, notifications },
          { default: render },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [makeRouter()] } });
  return { wrapper, dataProvider, queryClient };
}

afterEach(async () => {
  await commitAllUndoables();
});

describe("mode non-regression — pessimistic (default)", () => {
  it("useDelete default calls the server IMMEDIATELY, exactly once, no undoable notice", async () => {
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const del: { mutate?: (p: unknown) => void } = {};
    const probe = defineComponent({
      setup() {
        const m = useDelete<Resources, "posts">("posts");
        del.mutate = m.mutate as (p: unknown) => void;
        return () => null;
      },
    });
    const { dataProvider } = mountAdmin(() => h(probe), notifications);
    await flushPromises();
    const delSpy = vi.spyOn(dataProvider, "delete");

    del.mutate?.({ id: 1, previousData: { id: 1 } });
    await flushPromises();

    expect(delSpy).toHaveBeenCalledTimes(1);
    expect(delSpy).toHaveBeenCalledWith("posts", {
      id: 1,
      previousData: { id: 1 },
    });
    expect(notify.mock.calls.some((c) => c[1]?.undoable)).toBe(false);
    expect(hasPendingUndoables()).toBe(false);
  });

  it("useUpdate default calls the server exactly once", async () => {
    const notifications = createNotificationStore();
    const upd: { mutate?: (p: unknown) => void } = {};
    const probe = defineComponent({
      setup() {
        const m = useUpdate<Resources, "posts">("posts");
        upd.mutate = m.mutate as (p: unknown) => void;
        return () => null;
      },
    });
    const { dataProvider } = mountAdmin(() => h(probe), notifications);
    await flushPromises();
    const updSpy = vi.spyOn(dataProvider, "update");

    upd.mutate?.({ id: 1, data: { views: 99 } });
    await flushPromises();

    expect(updSpy).toHaveBeenCalledTimes(1);
  });
});

describe("mode non-regression — optimistic", () => {
  it("useUpdate optimistic patches the cache synchronously AND calls the server once", async () => {
    const notifications = createNotificationStore();
    const upd: { mutate?: (p: unknown) => void } = {};
    const probe = defineComponent({
      setup() {
        const m = useUpdate<Resources, "posts">("posts", {
          mutationMode: "optimistic",
        });
        upd.mutate = m.mutate as (p: unknown) => void;
        return () => null;
      },
    });
    const { dataProvider, queryClient } = mountAdmin(
      () => h(probe),
      notifications,
      (qc) => qc.setQueryData(oneKey("posts", { id: 1 }), { ...seed[0] }),
    );
    await flushPromises();
    const updSpy = vi.spyOn(dataProvider, "update");

    upd.mutate?.({ id: 1, data: { views: 0 } });
    await flushPromises();

    expect(
      queryClient.getQueryData<{ views: number }>(oneKey("posts", { id: 1 }))
        ?.views,
    ).toBe(0);
    expect(updSpy).toHaveBeenCalledTimes(1);
  });

  it("useDelete optimistic removes the row synchronously AND calls the server once", async () => {
    const notifications = createNotificationStore();
    const del: { mutate?: (p: unknown) => void } = {};
    const probe = defineComponent({
      setup() {
        const m = useDelete<Resources, "posts">("posts", {
          mutationMode: "optimistic",
        });
        del.mutate = m.mutate as (p: unknown) => void;
        return () => null;
      },
    });
    const { dataProvider, queryClient } = mountAdmin(
      () => h(probe),
      notifications,
      (qc) => qc.setQueryData(oneKey("posts", { id: 1 }), { ...seed[0] }),
    );
    await flushPromises();
    const delSpy = vi.spyOn(dataProvider, "delete");

    del.mutate?.({ id: 1, previousData: { id: 1 } });
    await flushPromises();

    expect(
      queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toBeUndefined();
    expect(delSpy).toHaveBeenCalledTimes(1);
  });
});

describe("beforeunload commit guard", () => {
  it("a pending undoable is committed (server called once) when the page unloads", async () => {
    const notifications = createNotificationStore();
    const del: { mutate?: (p: unknown) => void } = {};
    const probe = defineComponent({
      setup() {
        const m = useDelete<Resources, "posts">("posts", {
          mutationMode: "undoable",
        });
        del.mutate = m.mutate as (p: unknown) => void;
        return () => null;
      },
    });
    // Notification wires the beforeunload listener; probe starts the undoable.
    const { dataProvider } = mountAdmin(
      () => [h(Notification), h(probe)],
      notifications,
    );
    await flushPromises();
    const delSpy = vi.spyOn(dataProvider, "delete");

    del.mutate?.({ id: 1, previousData: { id: 1 } });
    expect(hasPendingUndoables()).toBe(true);
    expect(delSpy).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("beforeunload"));
    await flushPromises();

    expect(delSpy).toHaveBeenCalledTimes(1);
    expect(delSpy).toHaveBeenCalledWith("posts", {
      id: 1,
      previousData: { id: 1 },
    });
    expect(hasPendingUndoables()).toBe(false);
  });

  it("wires and tears down the beforeunload listener with the <Notification> lifecycle", async () => {
    const notifications = createNotificationStore();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    const { wrapper } = mountAdmin(() => h(Notification), notifications);
    await flushPromises();
    expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(true);

    wrapper.unmount();
    expect(remove.mock.calls.some(([type]) => type === "beforeunload")).toBe(
      true,
    );
  });
});
