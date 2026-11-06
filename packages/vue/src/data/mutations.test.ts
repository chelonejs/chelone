/**
 * `useCreate` and `useDataProvider` — mounted through probe components under a
 * real `<Admin>` over a seeded `fakeDataProvider`. Each case asserts what the
 * provider was asked and what the probe's mutation reports.
 */

import {
  createNotificationStore,
  defineResources,
  fakeDataProvider,
  type NotificationStore,
  type NotifyOptions,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { useDataProvider } from "../context";
import { useCreate, useDeleteMany, useUpdate } from "./mutations";
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
  notifications?: NotificationStore,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient, notifications },
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

describe("undoable mutate callbacks", () => {
  function setup<T>(use: () => T) {
    const dataProvider = seededDataProvider();
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    let mutation: T | undefined;
    const Probe = defineComponent({
      setup() {
        mutation = use();
        return () => h("div");
      },
    });
    mountUnderAdmin(dataProvider, Probe, notifications);
    const undoable = (): NotifyOptions => {
      const call = notify.mock.calls.find((args) => args[1]?.undoable);
      if (!call?.[1]) throw new Error("no undoable notification was enqueued");
      return call[1];
    };
    return {
      dataProvider,
      notify,
      undoable,
      mutation: () => defined(mutation),
    };
  }

  const undoablePosts = () =>
    useUpdate<Resources, "posts">("posts", { mutationMode: "undoable" });

  it("an undoable update calls onSuccess at once with the patched record", async () => {
    const { dataProvider, mutation } = setup(undoablePosts);
    const update = vi.spyOn(dataProvider, "update");
    await flushPromises();
    const onSuccess = vi.fn();
    const params = {
      id: 1,
      data: { title: "A!" },
      previousData: { id: 1, title: "a" },
    };

    mutation().mutate(params, { onSuccess });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, title: "A!" }, params);
    expect(update).not.toHaveBeenCalled();
  });

  it("an undoable update calls onError and onSettled when the commit fails", async () => {
    const { dataProvider, notify, undoable, mutation } = setup(undoablePosts);
    const failure = new Error("boom");
    vi.spyOn(dataProvider, "update").mockRejectedValue(failure);
    await flushPromises();
    const onError = vi.fn(() => {
      // Runs after the default error notification.
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.anything(),
      );
    });
    const onSettled = vi.fn();
    const params = { id: 1, data: { title: "A!" } };

    mutation().mutate(params, { onError, onSettled });
    expect(onSettled).not.toHaveBeenCalled();
    undoable().onClose?.();
    await vi.waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure, params);
    expect(onSettled).toHaveBeenCalledWith(params);
  });

  it("an undone update calls no callback after onSuccess", async () => {
    const { undoable, mutation } = setup(undoablePosts);
    await flushPromises();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();

    mutation().mutate(
      { id: 1, data: { title: "A!" } },
      { onSuccess, onError, onSettled },
    );
    undoable().undo?.();
    undoable().onClose?.();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("an undoable deleteMany calls onSuccess with the ids", async () => {
    const { dataProvider, mutation } = setup(() =>
      useDeleteMany<Resources, "posts">("posts", { mutationMode: "undoable" }),
    );
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    await flushPromises();
    const onSuccess = vi.fn();
    const params = { ids: [1, 2] };

    mutation().mutate(params, { onSuccess });

    expect(onSuccess).toHaveBeenCalledWith([1, 2], params);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
