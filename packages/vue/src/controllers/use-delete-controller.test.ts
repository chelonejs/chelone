import {
  createNotificationStore,
  defineResources,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import {
  type UseDeleteControllerOptions,
  type UseDeleteControllerReturn,
  useDeleteController,
} from "./use-delete-controller";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string() }),
  },
});
type Resources = typeof resources;
type Post = { id: number; title: string };

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

function mountDelete(options: UseDeleteControllerOptions = {}) {
  const capture: { result?: UseDeleteControllerReturn<Post> } = {};
  const dataProvider = fakeDataProvider<Resources>({
    posts: [
      { id: 1, title: "one" },
      { id: 2, title: "two" },
    ],
  });
  // <Admin>'s default layout drains the store into toasts, so assert on the
  // `notify` calls instead of the store's snapshot.
  const notifications: NotificationStore = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Probe = defineComponent({
    setup() {
      capture.result = useDeleteController<Resources, "posts">({
        resource: "posts",
        ...options,
      });
      return () => null;
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient, notifications },
          { default: () => h(Probe) },
        );
    },
  });
  mount(Harness, { global: { plugins: [makeRouter()] } });
  return { capture, dataProvider, notify };
}

describe("useDeleteController", () => {
  it("deleteOne deletes, notifies and requests the list redirect", async () => {
    const onRedirect = vi.fn();
    const { capture, dataProvider, notify } = mountDelete({
      onRedirect,
    });
    const deleteSpy = vi.spyOn(dataProvider, "delete");

    await capture.result?.deleteOne(1, {
      previousData: { id: 1, title: "one" },
    });
    await flushPromises();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy.mock.calls[0]![0]).toBe("posts");
    expect(deleteSpy.mock.calls[0]![1]).toMatchObject({ id: 1 });
    expect(notify).toHaveBeenCalledWith(
      "chelone.notification.deleted",
      expect.objectContaining({ type: "success" }),
    );
    expect(onRedirect).toHaveBeenCalledWith("list", "posts");
  });

  it("a provider error notifies http_error and resolves without rejecting", async () => {
    const onRedirect = vi.fn();
    const { capture, dataProvider, notify } = mountDelete({
      onRedirect,
    });
    vi.spyOn(dataProvider, "delete").mockRejectedValue(new Error("boom"));

    await expect(capture.result?.deleteOne(1)).resolves.toBeUndefined();
    await flushPromises();

    expect(notify).toHaveBeenCalledWith(
      "chelone.notification.http_error",
      expect.objectContaining({ type: "error" }),
    );
    expect(onRedirect).not.toHaveBeenCalled();
  });

  it("saving is true while the delete is in flight", async () => {
    const { capture, dataProvider } = mountDelete();
    let release: () => void = () => {};
    vi.spyOn(dataProvider, "delete").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { id: 1, title: "one" } });
        }),
    );
    expect(capture.result?.saving).toBe(false);

    const pending = capture.result?.deleteOne(1);
    await vi.waitFor(() => expect(capture.result?.saving).toBe(true));

    release();
    await pending;
    await vi.waitFor(() => expect(capture.result?.saving).toBe(false));
  });
});
