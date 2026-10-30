import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { provideResourceContext } from "../resource-context";
import {
  type UseShowControllerOptions,
  type UseShowControllerReturn,
  useShowController,
} from "./use-show-controller";

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

function mountShow(
  options: UseShowControllerOptions = {},
  provideResource?: string,
) {
  const capture: { result?: UseShowControllerReturn<Post> } = {};
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(rows),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();

  const Probe = defineComponent({
    setup() {
      capture.result = useShowController<Resources, "posts">(options);
      return () => null;
    },
  });
  const ResourceProvider = defineComponent({
    setup() {
      if (provideResource) provideResourceContext(provideResource);
      return () => h(Probe);
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          { default: () => h(ResourceProvider) },
        );
    },
  });
  mount(Harness, { global: { plugins: [router] } });
  return { capture, dataProvider };
}

const loaded = (result: () => UseShowControllerReturn<Post> | undefined) =>
  vi.waitFor(() => expect(result()?.isPending).toBe(false));

describe("useShowController", () => {
  it("loads one record by id", async () => {
    const { capture } = mountShow({ resource: "posts", id: 2 });
    await loaded(() => capture.result);
    expect(capture.result?.record).toEqual({
      id: 2,
      title: "second",
      views: 20,
    });
  });

  it("resolves the resource from the ambient <Resource> context", async () => {
    const { capture } = mountShow({ id: 3 }, "posts");
    await loaded(() => capture.result);
    expect(capture.result?.record?.title).toBe("third");
  });

  it("exposes read-only state (no save / saving)", async () => {
    const { capture } = mountShow({ resource: "posts", id: 1 });
    await loaded(() => capture.result);
    expect(capture.result?.isFetching).toBe(false);
    expect(capture.result?.error).toBeNull();
    expect(
      (capture.result as unknown as Record<string, unknown>).save,
    ).toBeUndefined();
  });
});
