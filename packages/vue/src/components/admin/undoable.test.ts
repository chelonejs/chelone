/**
 * R3-T3 tests: UNDOABLE mutation wiring in @chelone/vue.
 *
 * Proves the data-integrity invariants of the optimistic-with-Undo flow for the
 * `<DeleteButton>`, `<BulkDeleteButton>`, `<BulkUpdateButton>`, the `<Notification>`
 * SFC (Undo action + commit-on-close), and the `useDelete`/`useUpdate` composables:
 * - the change is applied to the query cache IMMEDIATELY (optimistic);
 * - the dataProvider is NOT called while the Undo window is open;
 * - clicking Undo rolls the cache back and the provider is NEVER called (0×);
 * - letting the window close COMMITS: the provider is called EXACTLY once;
 * - a commit error rolls the cache back and notifies the error.
 *
 * Like the React twin, the undoable notification's `undo`/`onClose` callbacks are
 * captured off the notification store's `notify` spy, so the button integrity
 * assertions are deterministic — the `<Notification>` render + timer wiring is
 * covered separately below.
 */

import {
  createNotificationStore,
  defineResources,
  fakeDataProvider,
  type GetListResult,
  type NotificationStore,
  type NotifyOptions,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import {
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import { useDelete, useUpdate } from "../../data/mutations";
import { type ListContextValue, useListContext } from "../../list/list-context";
import { provideRecordContext } from "../../record/record-context";
import BulkDeleteButton from "./buttons/bulk-delete-button.vue";
import BulkUpdateButton from "./buttons/bulk-update-button.vue";
import DeleteButton from "./buttons/delete-button.vue";
import Notification from "./feedback/notification.vue";
import List from "./view/list.vue";

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
  { id: 3, title: "Three", views: 30 },
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
  router: Router = makeRouter(),
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
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient, notifications },
          {
            default: render,
          },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider, queryClient, router };
}

const listProbe = (capture: { list?: ListContextValue }) =>
  defineComponent({
    setup() {
      capture.list = useListContext();
      return () => null;
    },
  });

const withRecord = (record: Post, child: () => VNodeChild) =>
  defineComponent({
    setup() {
      provideRecordContext(record);
      return () => child();
    },
  });

const settled = (capture: { list?: ListContextValue }) =>
  vi.waitFor(() => expect(capture.list?.isPending).toBe(false));

/** Read the ids currently in the cached posts list (partial-match key). */
function cachedIds(qc: QueryClient): (string | number)[] {
  const entries = qc.getQueriesData<GetListResult>({
    queryKey: ["posts", "getList"],
  });
  const hit = entries.find(([, v]) => v);
  return (hit?.[1]?.data ?? []).map((r) => r.id as string | number);
}

/** Read a row (by id) from the cached posts list. */
function cachedRow(qc: QueryClient, id: number): Post | undefined {
  const entries = qc.getQueriesData<GetListResult>({
    queryKey: ["posts", "getList"],
  });
  const hit = entries.find(([, v]) => v);
  return (hit?.[1]?.data ?? []).find((r) => r.id === id) as Post | undefined;
}

/** The undoable notification options captured off the store's `notify` spy. */
function captureUndoable(
  notify: MockInstance<NotificationStore["notify"]>,
): NotifyOptions {
  const call = notify.mock.calls.find((args) => args[1]?.undoable);
  if (!call) throw new Error("no undoable notification was enqueued");
  const options = call[1];
  if (!options) throw new Error("undoable notification had no options");
  return options;
}

describe("undoable <BulkDeleteButton>", () => {
  it("removes rows optimistically and defers the provider call", async () => {
    const capture: { list?: ListContextValue } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper, dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture)),
              h(BulkDeleteButton, {
                resource: "posts",
                mutationMode: "undoable",
              }),
            ],
          },
        ),
      notifications,
    );
    await settled(capture);
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    capture.list?.select([1, 3]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1, 3]));

    await wrapper.find('[data-slot="bulk-delete-button"]').trigger("click");

    // Rows gone from the cache NOW; the server is untouched.
    expect(cachedIds(queryClient)).toEqual([2]);
    expect(deleteMany).not.toHaveBeenCalled();
    const options = captureUndoable(notify);
    expect(options.undoable).toBe(true);
    expect(options.autoHideDuration).toBe(5000);
    // Selection cleared optimistically.
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([]));
  });

  it("Undo restores the rows and NEVER calls the provider", async () => {
    const capture: { list?: ListContextValue } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper, dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture)),
              h(BulkDeleteButton, {
                resource: "posts",
                mutationMode: "undoable",
              }),
            ],
          },
        ),
      notifications,
    );
    await settled(capture);
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    capture.list?.select([1, 3]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1, 3]));

    await wrapper.find('[data-slot="bulk-delete-button"]').trigger("click");
    const options = captureUndoable(notify);
    options.undo?.();

    expect(cachedIds(queryClient)).toEqual([1, 2, 3]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("commit calls the provider EXACTLY once (double close still once)", async () => {
    const capture: { list?: ListContextValue } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper, dataProvider } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture)),
              h(BulkDeleteButton, {
                resource: "posts",
                mutationMode: "undoable",
              }),
            ],
          },
        ),
      notifications,
    );
    await settled(capture);
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    capture.list?.select([1, 3]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1, 3]));

    await wrapper.find('[data-slot="bulk-delete-button"]').trigger("click");
    const options = captureUndoable(notify);
    options.onClose?.();
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith("posts", { ids: [1, 3] });
    // A double close (belt-and-suspenders) still commits only once.
    options.onClose?.();
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it("commit error rolls the cache back and notifies the error", async () => {
    const capture: { list?: ListContextValue } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper, dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture)),
              h(BulkDeleteButton, {
                resource: "posts",
                mutationMode: "undoable",
              }),
            ],
          },
        ),
      notifications,
    );
    await settled(capture);
    vi.spyOn(dataProvider, "deleteMany").mockRejectedValue(new Error("boom"));
    capture.list?.select([1]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1]));

    await wrapper.find('[data-slot="bulk-delete-button"]').trigger("click");
    const options = captureUndoable(notify);
    options.onClose?.();
    await flushPromises();

    // Rolled back to all three rows.
    expect(cachedIds(queryClient)).toEqual([1, 2, 3]);
    expect(notify).toHaveBeenCalledWith(
      "ra.notification.http_error",
      expect.objectContaining({ type: "error" }),
    );
  });
});

describe("undoable <BulkUpdateButton>", () => {
  it("patches rows optimistically, then commits once", async () => {
    const capture: { list?: ListContextValue } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper, dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture)),
              h(BulkUpdateButton, {
                resource: "posts",
                mutationMode: "undoable",
                data: { views: 0 },
              }),
            ],
          },
        ),
      notifications,
    );
    await settled(capture);
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    capture.list?.select([1, 2]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1, 2]));

    await wrapper.find('[data-slot="bulk-update-button"]').trigger("click");

    expect(cachedRow(queryClient, 1)?.views).toBe(0);
    expect(cachedRow(queryClient, 3)?.views).toBe(30);
    expect(updateMany).not.toHaveBeenCalled();

    const options = captureUndoable(notify);
    options.onClose?.();
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith("posts", {
      ids: [1, 2],
      data: { views: 0 },
    });
  });

  it("Undo restores the original values without calling the provider", async () => {
    const capture: { list?: ListContextValue } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper, dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture)),
              h(BulkUpdateButton, {
                resource: "posts",
                mutationMode: "undoable",
                data: { views: 0 },
              }),
            ],
          },
        ),
      notifications,
    );
    await settled(capture);
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    capture.list?.select([1, 2]);
    await vi.waitFor(() => expect(capture.list?.selectedIds).toEqual([1, 2]));

    await wrapper.find('[data-slot="bulk-update-button"]').trigger("click");
    const options = captureUndoable(notify);
    options.undo?.();

    expect(cachedRow(queryClient, 1)?.views).toBe(10);
    expect(cachedRow(queryClient, 2)?.views).toBe(20);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("undoable <DeleteButton>", () => {
  it("deletes optimistically with NO confirm dialog and defers the provider", async () => {
    const capture: { list?: ListContextValue } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper, dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture)),
              h(
                withRecord({ id: 2, title: "Two", views: 20 }, () =>
                  h(DeleteButton, {
                    resource: "posts",
                    mutationMode: "undoable",
                    redirect: false,
                  }),
                ),
              ),
            ],
          },
        ),
      notifications,
    );
    await settled(capture);
    const del = vi.spyOn(dataProvider, "delete");

    await wrapper.find('[data-slot="delete-button"]').trigger("click");

    // No confirm dialog — the record vanishes immediately.
    expect(wrapper.find('[data-slot="confirm"]').exists()).toBe(false);
    expect(cachedIds(queryClient)).toEqual([1, 3]);
    expect(del).not.toHaveBeenCalled();
    expect(captureUndoable(notify).undoable).toBe(true);
  });

  it("commit calls delete once; Undo calls it zero times", async () => {
    // Commit path.
    const capture1: { list?: ListContextValue } = {};
    const n1 = createNotificationStore();
    const notify1 = vi.spyOn(n1, "notify");
    const { wrapper: w1, dataProvider: dp1 } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture1)),
              h(
                withRecord({ id: 2, title: "Two", views: 20 }, () =>
                  h(DeleteButton, {
                    resource: "posts",
                    mutationMode: "undoable",
                    redirect: false,
                  }),
                ),
              ),
            ],
          },
        ),
      n1,
    );
    await settled(capture1);
    const del1 = vi.spyOn(dp1, "delete");
    await w1.find('[data-slot="delete-button"]').trigger("click");
    captureUndoable(notify1).onClose?.();
    expect(del1).toHaveBeenCalledTimes(1);
    expect(del1).toHaveBeenCalledWith("posts", {
      id: 2,
      previousData: { id: 2, title: "Two", views: 20 },
    });

    // Undo path.
    const capture2: { list?: ListContextValue } = {};
    const n2 = createNotificationStore();
    const notify2 = vi.spyOn(n2, "notify");
    const {
      wrapper: w2,
      dataProvider: dp2,
      queryClient: qc2,
    } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [
              h(listProbe(capture2)),
              h(
                withRecord({ id: 2, title: "Two", views: 20 }, () =>
                  h(DeleteButton, {
                    resource: "posts",
                    mutationMode: "undoable",
                    redirect: false,
                  }),
                ),
              ),
            ],
          },
        ),
      n2,
    );
    await settled(capture2);
    const del2 = vi.spyOn(dp2, "delete");
    await w2.find('[data-slot="delete-button"]').trigger("click");
    captureUndoable(notify2).undo?.();
    expect(cachedIds(qc2)).toEqual([1, 2, 3]);
    expect(del2).not.toHaveBeenCalled();
  });
});

describe("undoable useDelete / useUpdate composables", () => {
  const mutationProbe = (capture: { del?: ReturnType<typeof useDelete> }) =>
    defineComponent({
      setup() {
        capture.del = useDelete("posts", { mutationMode: "undoable" });
        return () => null;
      },
    });

  it("useDelete removes the row now, defers delete, commits once", async () => {
    const capture: { list?: ListContextValue } = {};
    const del: { del?: ReturnType<typeof useDelete> } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          {
            default: () => [h(listProbe(capture)), h(mutationProbe(del))],
          },
        ),
      notifications,
    );
    await settled(capture);
    const delSpy = vi.spyOn(dataProvider, "delete");

    del.del?.mutate({ id: 2, previousData: { id: 2 } });
    // Optimistic removal + deferred server call.
    expect(cachedIds(queryClient)).toEqual([1, 3]);
    expect(delSpy).not.toHaveBeenCalled();

    captureUndoable(notify).onClose?.();
    expect(delSpy).toHaveBeenCalledTimes(1);
    expect(delSpy).toHaveBeenCalledWith("posts", {
      id: 2,
      previousData: { id: 2 },
    });
  });

  it("useUpdate patches now, defers update; Undo restores + 0 calls", async () => {
    const capture: { list?: ListContextValue } = {};
    const upd: { up?: ReturnType<typeof useUpdate> } = {};
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const probe = defineComponent({
      setup() {
        upd.up = useUpdate("posts", { mutationMode: "undoable" });
        return () => null;
      },
    });
    const { dataProvider, queryClient } = mountAdmin(
      () =>
        h(
          List,
          { resource: "posts" },
          { default: () => [h(listProbe(capture)), h(probe)] },
        ),
      notifications,
    );
    await settled(capture);
    const updSpy = vi.spyOn(dataProvider, "update");

    upd.up?.mutate({ id: 1, data: { views: 99 }, previousData: { id: 1 } });
    expect(cachedRow(queryClient, 1)?.views).toBe(99);
    expect(updSpy).not.toHaveBeenCalled();

    captureUndoable(notify).undo?.();
    expect(cachedRow(queryClient, 1)?.views).toBe(10);
    expect(updSpy).not.toHaveBeenCalled();
  });
});

describe("<Notification> undoable render", () => {
  let store: NotificationStore;

  beforeEach(() => {
    store = createNotificationStore();
  });

  function mountNotification() {
    const dataProvider = fakeDataProvider<Resources>({
      posts: structuredClone(seed),
    });
    const queryClient = new QueryClient();
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider, queryClient, notifications: store },
            { default: () => h(Notification) },
          );
      },
    });
    return mount(Harness, { global: { plugins: [makeRouter()] } });
  }

  it("renders an Undo action; Undo → undo() not onClose()", async () => {
    const wrapper = mountNotification();
    const undo = vi.fn();
    const onClose = vi.fn();
    store.notify("ra.notification.deleted", {
      undoable: true,
      autoHideDuration: 5000,
      undo,
      onClose,
    });
    await flushPromises();

    const undoBtn = wrapper.find('[data-slot="notification-undo"]');
    expect(undoBtn.exists()).toBe(true);

    await undoBtn.trigger("click");
    expect(undo).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("close (X) commits via onClose()", async () => {
    const wrapper = mountNotification();
    const undo = vi.fn();
    const onClose = vi.fn();
    store.notify("ra.notification.deleted", {
      undoable: true,
      autoHideDuration: 5000,
      undo,
      onClose,
    });
    await flushPromises();

    await wrapper.find('[data-slot="notification-close"]').trigger("click");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
  });

  it("auto-hide timeout commits via onClose()", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountNotification();
      const undo = vi.fn();
      const onClose = vi.fn();
      store.notify("ra.notification.deleted", {
        undoable: true,
        autoHideDuration: 5000,
        undo,
        onClose,
      });
      // Flush the watch (microtasks) under fake timers.
      await vi.advanceTimersByTimeAsync(0);
      expect(wrapper.find('[data-slot="notification-undo"]').exists()).toBe(
        true,
      );

      await vi.advanceTimersByTimeAsync(5000);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(undo).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
