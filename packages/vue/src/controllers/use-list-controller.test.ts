import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { provideResourceContext } from "../resource-context";
import {
  type UseListControllerOptions,
  type UseListControllerReturn,
  useListController,
} from "./use-list-controller";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type Resources = typeof resources;
type Post = { id: number; title: string; views: number };

const rows: Post[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${String(i + 1).padStart(2, "0")}`,
  views: (i * 7) % 5,
}));

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

/**
 * Mount `useListController` inside a real `<Admin>` (which provides the Chelone
 * context + a mounted vue-query client + the router adapter) and hand back the
 * live reactive result. `<Admin>` gets a retry-off client so failures surface
 * fast in tests.
 */
function mountList(
  options: UseListControllerOptions<Post> = {},
  provideResource?: string,
) {
  const capture: { result?: UseListControllerReturn<Post> } = {};
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(rows),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();

  const Probe = defineComponent({
    setup() {
      capture.result = useListController<Resources, "posts">(options);
      return () => null;
    },
  });

  // `provide` is visible only to DESCENDANTS, so the ambient resource name must
  // come from an ANCESTOR of the probe — a wrapper, not the probe itself.
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

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, capture };
}

const settled = (result: () => UseListControllerReturn<Post> | undefined) =>
  vi.waitFor(() => expect(result()?.isPending).toBe(false));

describe("useListController", () => {
  it("loads seeded rows: page 1 of 10, total 25", async () => {
    const { capture } = mountList({ resource: "posts" });
    await settled(() => capture.result);
    const r = capture.result;
    expect(r?.data?.length).toBe(10);
    expect(r?.total).toBe(25);
    expect(r?.page).toBe(1);
    expect(r?.hasNextPage).toBe(true);
    expect(r?.hasPreviousPage).toBe(false);
  });

  it("paginates: setPage(2) loads the second page", async () => {
    const { capture } = mountList({ resource: "posts" });
    await settled(() => capture.result);

    capture.result?.setPage(2);
    await flushPromises();
    await vi.waitFor(() => expect(capture.result?.page).toBe(2));

    const r = capture.result;
    expect(r?.page).toBe(2);
    expect(r?.data?.[0]?.id).toBe(11);
    expect(r?.hasPreviousPage).toBe(true);
  });

  it("sorts: setSort by title DESC reaches the provider", async () => {
    const { capture } = mountList({ resource: "posts", perPage: 5 });
    await settled(() => capture.result);

    capture.result?.setSort({ field: "title", order: "DESC" });
    await flushPromises();
    await vi.waitFor(() =>
      expect(capture.result?.sort).toEqual([{ field: "title", order: "DESC" }]),
    );
    await vi.waitFor(() =>
      expect(capture.result?.data?.[0]?.title).toBe("t25"),
    );

    expect(capture.result?.page).toBe(1);
    expect(capture.result?.data?.[0]?.id).toBe(25);
  });

  it("toggleItem tracks the selection reactively", async () => {
    const { capture } = mountList({ resource: "posts" });
    await settled(() => capture.result);

    capture.result?.toggleItem(3);
    await nextTick();
    expect(capture.result?.selectedIds).toEqual([3]);

    capture.result?.toggleItem(3);
    await nextTick();
    expect(capture.result?.selectedIds).toEqual([]);
  });

  it("reads the resource from the ambient <Resource> context when not passed", async () => {
    const { capture } = mountList({}, "posts");
    await settled(() => capture.result);
    expect(capture.result?.total).toBe(25);
  });
});
