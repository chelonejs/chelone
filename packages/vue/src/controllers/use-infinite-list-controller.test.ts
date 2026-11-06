import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { useInfiniteListContext } from "../list/infinite-list-context";
import { provideListContext } from "../list/list-context";
import {
  type UseInfiniteListControllerReturn,
  useInfiniteListController,
} from "./use-infinite-list-controller";
import { useListController } from "./use-list-controller";

const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  group: z.string(),
});
const resources = defineResources({ posts: { schema: postSchema } });
type Resources = typeof resources;
type Post = z.infer<typeof postSchema>;

// 25 rows: pages of 10, 10 and 5. Odd ids are group "a", even ids group "b".
const rows: Post[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
  group: i % 2 === 0 ? "a" : "b",
}));

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Live QueryObserver subscriptions across the whole cache. */
const observerCount = (queryClient: QueryClient): number =>
  queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);

const mounted: Array<{ wrapper: VueWrapper; queryClient: QueryClient }> = [];

afterEach(() => {
  for (const { wrapper, queryClient } of mounted.splice(0)) {
    if (wrapper.exists()) wrapper.unmount();
    queryClient.clear();
  }
});

/**
 * Mounts the `Probe` that `build` returns under a real `<Admin>`. `build`
 * receives `capture`, where a probe can leave the controller result it reads.
 */
function mountUnderAdmin(
  build: (capture: { result?: UseInfiniteListControllerReturn<Post> }) => {
    Probe: Component;
  },
  prepare?: (
    dataProvider: ReturnType<typeof fakeDataProvider<Resources>>,
  ) => void,
) {
  const capture: { result?: UseInfiniteListControllerReturn<Post> } = {};
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(rows),
  });
  const getList = vi.spyOn(dataProvider, "getList");
  prepare?.(dataProvider);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { Probe } = build(capture);
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: () => h(Probe), layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  mounted.push({ wrapper, queryClient });
  return { wrapper, capture, getList, queryClient, dataProvider };
}

function mountInfiniteList(prepare?: Parameters<typeof mountUnderAdmin>[1]) {
  return mountUnderAdmin(
    (capture) => ({
      Probe: defineComponent({
        setup() {
          capture.result = useInfiniteListController<Resources, "posts">({
            resource: "posts",
          });
          return () => null;
        },
      }),
    }),
    prepare,
  );
}

const settled = (
  result: () => UseInfiniteListControllerReturn<Post> | undefined,
) => vi.waitFor(() => expect(result()?.isPending).toBe(false));
const ids = (result: () => UseInfiniteListControllerReturn<Post> | undefined) =>
  result()?.data?.map((r) => r.id);

describe("useInfiniteListController", () => {
  it("useInfiniteListController exposes the flattened rows and fetchNextPage appends the next page", async () => {
    const { capture } = mountInfiniteList();
    await settled(() => capture.result);
    expect(ids(() => capture.result)).toEqual(range(1, 10));
    expect(capture.result?.total).toBe(25);
    expect(capture.result?.hasNextPage).toBe(true);

    await capture.result?.fetchNextPage();
    await vi.waitFor(() =>
      expect(ids(() => capture.result)).toEqual(range(1, 20)),
    );
    expect(capture.result?.page).toBe(1);
    expect(capture.result?.isFetchingNextPage).toBe(false);
  });

  it("useInfiniteListController hasNextPage is false after the last page and fetchNextPage calls the provider no more", async () => {
    const { capture, getList } = mountInfiniteList();
    await settled(() => capture.result);
    await capture.result?.fetchNextPage();
    await capture.result?.fetchNextPage();
    await vi.waitFor(() => expect(capture.result?.data).toHaveLength(25));
    expect(capture.result?.hasNextPage).toBe(false);

    getList.mockClear();
    await capture.result?.fetchNextPage();
    expect(getList).not.toHaveBeenCalled();
    expect(capture.result?.data).toHaveLength(25);
  });

  it("useInfiniteListController setFilters restarts from page 1", async () => {
    const { capture, getList } = mountInfiniteList();
    await settled(() => capture.result);
    await capture.result?.fetchNextPage();
    await vi.waitFor(() => expect(capture.result?.data).toHaveLength(20));

    capture.result?.setFilters({ group: "a" });
    await vi.waitFor(() =>
      expect(ids(() => capture.result)).toEqual(
        range(0, 9).map((i) => i * 2 + 1),
      ),
    );
    expect(capture.result?.total).toBe(13);
    expect(capture.result?.hasNextPage).toBe(true);
    expect(getList.mock.calls.at(-1)?.[1]).toMatchObject({
      filter: { group: "a" },
      pagination: { page: 1 },
    });
  });

  it("useInfiniteListController reports a provider failure as error and leaves no rows", async () => {
    const { capture } = mountInfiniteList((dataProvider) =>
      vi.spyOn(dataProvider, "getList").mockRejectedValue(new Error("boom")),
    );
    await vi.waitFor(() =>
      expect(capture.result?.error).toEqual(new Error("boom")),
    );
    expect(capture.result?.data).toBeUndefined();
    expect(capture.result?.hasNextPage).toBeUndefined();
  });

  it("useInfiniteListController unmount releases every observer", async () => {
    const { wrapper, capture, queryClient } = mountInfiniteList();
    await settled(() => capture.result);
    await capture.result?.fetchNextPage();
    expect(observerCount(queryClient)).toBeGreaterThan(0);
    wrapper.unmount();
    await flushPromises();
    expect(observerCount(queryClient)).toBe(0);
  });
});

describe("useInfiniteListContext", () => {
  /** Publishes `useList()` as the ambient list, then mounts `useInfiniteListContext` below it. */
  function mountUnderList(
    useList: () => Parameters<typeof provideListContext>[0],
  ) {
    const seen: {
      list?: ReturnType<typeof useInfiniteListContext>;
      error?: unknown;
    } = {};
    const Reader = defineComponent({
      setup() {
        try {
          seen.list = useInfiniteListContext();
        } catch (error) {
          seen.error = error;
        }
        return () => null;
      },
    });
    const Publisher = defineComponent({
      setup() {
        provideListContext(useList());
        return () => h(Reader);
      },
    });
    mountUnderAdmin(() => ({ Probe: Publisher }));
    return seen;
  }

  it("useInfiniteListContext returns the infinite fields under an infinite list and throws under a plain list", async () => {
    const seen = mountUnderList(() =>
      useInfiniteListController<Resources, "posts">({ resource: "posts" }),
    );
    await vi.waitFor(() => expect(seen.list?.isPending).toBe(false));
    expect(seen.list?.hasNextPage).toBe(true);
    expect(seen.list?.isFetchingNextPage).toBe(false);
    await seen.list?.fetchNextPage();
    await vi.waitFor(() => expect(seen.list?.data).toHaveLength(20));

    const plain = mountUnderList(() =>
      useListController<Resources, "posts">({
        resource: "posts",
        syncWithLocation: false,
      }),
    );
    expect(plain.list).toBeUndefined();
    const error = plain.error;
    if (!(error instanceof Error)) throw error;
    expect(error.message).toBe(
      "useInfiniteListContext: the ambient list is not an infinite list",
    );
  });
});
