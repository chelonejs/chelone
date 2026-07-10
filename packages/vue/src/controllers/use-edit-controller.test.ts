import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import {
  type UseEditControllerOptions,
  type UseEditControllerReturn,
  useEditController,
} from "./use-edit-controller";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type Resources = typeof resources;
type Post = { id: number; title: string; views: number };

const rows: Post[] = [
  { id: 1, title: "first", views: 10 },
  { id: 2, title: "second", views: 20 },
  { id: 3, title: "third", views: 30 },
];

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

function mountEdit(options: UseEditControllerOptions<Post>) {
  const capture: { result?: UseEditControllerReturn<Post> } = {};
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(rows),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();

  const Probe = defineComponent({
    setup() {
      capture.result = useEditController<Resources, "posts">(options);
      return () => null;
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(Admin, { dataProvider, queryClient }, { default: () => h(Probe) });
    },
  });
  mount(Harness, { global: { plugins: [router] } });
  return { capture, dataProvider };
}

const loaded = (result: () => UseEditControllerReturn<Post> | undefined) =>
  vi.waitFor(() => expect(result()?.isPending).toBe(false));

describe("useEditController", () => {
  it("loads one record by id", async () => {
    const { capture } = mountEdit({ resource: "posts", id: 2 });
    await loaded(() => capture.result);
    expect(capture.result?.record).toEqual({
      id: 2,
      title: "second",
      views: 20,
    });
  });

  it("save persists — getOne reflects the change", async () => {
    const { capture, dataProvider } = mountEdit({ resource: "posts", id: 2 });
    await loaded(() => capture.result);

    const errors = await capture.result?.save({ title: "second-edited" });
    expect(errors).toBeUndefined();
    await flushPromises();

    // The DataProvider (the source of truth) has the new value.
    const fetched = await dataProvider.getOne("posts", { id: 2 });
    expect(fetched.data.title).toBe("second-edited");

    // The controller's own record reconciles via the invalidated getOne.
    await vi.waitFor(() =>
      expect(capture.result?.record?.title).toBe("second-edited"),
    );
  });

  it("exposes the reactive `saving` flag", async () => {
    const { capture } = mountEdit({ resource: "posts", id: 1 });
    await loaded(() => capture.result);
    expect(capture.result?.saving).toBe(false);
  });
});
