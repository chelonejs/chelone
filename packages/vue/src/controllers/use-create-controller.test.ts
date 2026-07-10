import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import {
  type UseCreateControllerOptions,
  type UseCreateControllerReturn,
  useCreateController,
} from "./use-create-controller";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type Resources = typeof resources;
type Post = { id: number; title: string; views: number };

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

function mountCreate(options: UseCreateControllerOptions<Post> = {}) {
  const capture: { result?: UseCreateControllerReturn<Post> } = {};
  const dataProvider = fakeDataProvider<Resources>({
    posts: [{ id: 1, title: "existing", views: 5 }],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();

  const Probe = defineComponent({
    setup() {
      capture.result = useCreateController<Resources, "posts">(options);
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

describe("useCreateController", () => {
  it("has nothing to fetch — isPending is false from birth", () => {
    const { capture } = mountCreate({ resource: "posts" });
    expect(capture.result?.isPending).toBe(false);
    expect(capture.result?.saving).toBe(false);
  });

  it("save adds a record to the provider", async () => {
    const { capture, dataProvider } = mountCreate({ resource: "posts" });

    const errors = await capture.result?.save({ title: "brand-new", views: 0 });
    expect(errors).toBeUndefined();
    await flushPromises();

    const list = await dataProvider.getList("posts", {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "id", order: "ASC" },
      filter: {},
    });
    expect(list.total).toBe(2);
    expect(list.data.some((p) => p.title === "brand-new")).toBe(true);
  });

  it("seeds the record from the `record` option", () => {
    const { capture } = mountCreate({
      resource: "posts",
      record: { title: "seed" },
    });
    expect(capture.result?.record).toEqual({ title: "seed" });
  });
});
