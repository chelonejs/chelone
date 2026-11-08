/**
 * URL-sync (R1) coverage for the Vue `useListController` — the twin of the React
 * `url-sync.test.tsx`. Mounts the controller inside a real `<Admin>` (Chelone
 * context + vue-query client + the vue-router adapter) over a `createMemoryHistory`
 * router, then asserts the ra-core `useListParams` contract:
 *  - a deep-linked route SEEDS the initial params (filter/sort/page/perPage);
 *  - a param change PUSHES the full query back to the URL (`replace`);
 *  - a clean URL stays clean on mount (no spurious push);
 *  - a later location change (back/forward, a followed link) re-seeds the params;
 *  - `syncWithLocation: false` neither reads nor writes the URL.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
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
interface Post {
  id: number;
  title: string;
  views: number;
}

const rows: Post[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${String(i + 1).padStart(2, "0")}`,
  views: (i * 7) % 5,
}));

async function makeRouter(initial = "/"): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(initial);
  await router.isReady();
  return router;
}

/**
 * Mount `useListController` under `<Admin>` over the given router and hand back
 * the live reactive result plus the router (to read/assert the URL query).
 */
function mountList(
  router: Router,
  options: UseListControllerOptions<Post> = {},
) {
  const capture: { result?: UseListControllerReturn<Post> } = {};
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(rows),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Probe = defineComponent({
    setup() {
      capture.result = useListController<Resources, "posts">(options);
      return () => null;
    },
  });

  const Harness = defineComponent({
    setup() {
      return () =>
        h(Admin, { dataProvider, queryClient }, { default: () => h(Probe) });
    },
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, capture };
}

const settled = (result: () => UseListControllerReturn<Post> | undefined) =>
  vi.waitFor(() => expect(result()?.isPending).toBe(false));

/** The parsed query on the router's current location. */
const currentQuery = (router: Router) => router.currentRoute.value.query;

describe("useListController — URL sync (R1)", () => {
  it("seeds page + perPage from a deep-linked URL on mount", async () => {
    const router = await makeRouter("/?page=2&perPage=5");
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);

    const r = capture.result;
    expect(r?.page).toBe(2);
    expect(r?.perPage).toBe(5);
    // page 2 of perPage 5 → ids 6..10 (the FIRST fetch already used the seed).
    expect(r?.data?.map((p) => p.id)).toEqual([6, 7, 8, 9, 10]);
  });

  it("seeds filter + sort/order from a deep-linked URL on mount", async () => {
    const search = `/?filter=${encodeURIComponent(
      JSON.stringify({ title: "t25" }),
    )}&sort=title&order=DESC`;
    const router = await makeRouter(search);
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);

    const r = capture.result;
    expect(r?.filter).toEqual({ title: "t25" });
    expect(r?.sort).toEqual([{ field: "title", order: "DESC" }]);
    expect(r?.data?.map((p) => p.id)).toEqual([25]);
  });

  it("a deep-linked sort on the default sort field keeps its order", async () => {
    const router = await makeRouter("/?sort=title&order=ASC");
    const { capture } = mountList(router, {
      resource: "posts",
      sort: { field: "title", order: "ASC" },
    });
    await settled(() => capture.result);

    expect(capture.result?.sort).toEqual([{ field: "title", order: "ASC" }]);
  });

  it("pushes a setFilters change to the URL (filter JSON-encoded)", async () => {
    const router = await makeRouter("/");
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);

    capture.result?.setFilters({ title: "t01" });
    await flushPromises();
    await vi.waitFor(() =>
      expect(currentQuery(router).filter).toBe(
        JSON.stringify({ title: "t01" }),
      ),
    );
    expect(currentQuery(router).page).toBe("1");
  });

  it("pushes setPage changes to the URL", async () => {
    const router = await makeRouter("/");
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);

    capture.result?.setPage(2);
    await flushPromises();
    await vi.waitFor(() => expect(currentQuery(router).page).toBe("2"));
  });

  it("does NOT touch the URL on mount (clean URL stays clean)", async () => {
    const router = await makeRouter("/");
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/");
    expect(currentQuery(router)).toEqual({});
  });

  it("a later location change re-seeds the params (back/forward)", async () => {
    const router = await makeRouter("/?page=2&perPage=5");
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);

    await router.push("/?page=4&perPage=5");
    await vi.waitFor(() => expect(capture.result?.page).toBe(4));
    await vi.waitFor(() =>
      expect(capture.result?.data?.map((p) => p.id)).toEqual([
        16, 17, 18, 19, 20,
      ]),
    );

    router.back();
    await vi.waitFor(() => expect(capture.result?.page).toBe(2));
    await settled(() => capture.result);
  });

  it("its own push does not re-seed or navigate again", async () => {
    const router = await makeRouter("/");
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);
    const replace = vi.spyOn(router, "replace");

    capture.result?.setPage(2);
    await vi.waitFor(() => expect(currentQuery(router).page).toBe("2"));
    await flushPromises();
    await settled(() => capture.result);
    expect(capture.result?.page).toBe(2);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("syncWithLocation:false leaves the URL untouched on a param change", async () => {
    const router = await makeRouter("/");
    const { capture } = mountList(router, {
      resource: "posts",
      syncWithLocation: false,
    });
    await settled(() => capture.result);

    capture.result?.setPage(2);
    await flushPromises();
    await vi.waitFor(() => expect(capture.result?.page).toBe(2));

    // State moved, but the route did not.
    expect(router.currentRoute.value.fullPath).toBe("/");
    expect(currentQuery(router)).toEqual({});
  });

  it("syncWithLocation:false ignores a deep-linked URL (keeps defaults)", async () => {
    const router = await makeRouter("/?page=3&perPage=5");
    const { capture } = mountList(router, {
      resource: "posts",
      syncWithLocation: false,
    });
    await settled(() => capture.result);

    // Deep link ignored → controller defaults (page 1, perPage 10).
    expect(capture.result?.page).toBe(1);
    expect(capture.result?.perPage).toBe(10);
  });

  it("setParams with filter, sort and perPage navigates once", async () => {
    const router = await makeRouter("/");
    const { capture } = mountList(router, { resource: "posts" });
    await settled(() => capture.result);
    const replace = vi.spyOn(router, "replace");

    capture.result?.setParams({
      filter: { title: "t01" },
      sort: { field: "views", order: "DESC" },
      perPage: 5,
    });
    await flushPromises();
    await vi.waitFor(() => expect(capture.result?.perPage).toBe(5));
    await settled(() => capture.result);
    await vi.waitFor(() =>
      expect(currentQuery(router).filter).toBe(
        JSON.stringify({ title: "t01" }),
      ),
    );

    expect(replace).toHaveBeenCalledTimes(1);
    const query = currentQuery(router);
    expect(query.sort).toBe("views");
    expect(query.order).toBe("DESC");
    expect(query.perPage).toBe("5");
    expect(capture.result?.data?.map((p) => p.id)).toEqual([1]);
  });
});
