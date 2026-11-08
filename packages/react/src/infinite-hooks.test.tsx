import { createStore, defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import { useListController } from "./controller-hooks";
import { ListContextProvider, type ListContextValue } from "./form";
import {
  type UseInfiniteListControllerResult,
  useInfiniteGetList,
  useInfiniteListController,
} from "./infinite-hooks";
import { useInfiniteListContext } from "./list/infinite-list-context";

// `looseObject` on purpose: these tests filter on plain field names, and a
// strict record keys its filter by `FilterSourceKey` — `q` plus operator
// suffixes only. Filter-key typing is pinned in core's source-path.test-d.ts.
const postSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  group: z.string(),
});
const resources = defineResources({ posts: { schema: postSchema } });
type Post = z.infer<typeof postSchema>;

// 25 rows: pages of 10, 10 and 5. Odd ids are group "a", even ids group "b".
const rows: Post[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
  group: i % 2 === 0 ? "a" : "b",
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const getList = vi.spyOn(dataProvider, "getList");
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, queryClient, getList };
}

/** Live QueryObserver subscriptions across the whole cache. */
function observerCount(queryClient: QueryClient): number {
  return queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("useInfiniteGetList", () => {
  it("loads page 1 and fetchNextPage appends page 2", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useInfiniteGetList<typeof resources, "posts">("posts", {
          pagination: { page: 1, perPage: 10 },
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.data).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages[1]?.data.map((r) => r.id)).toEqual(
      range(11, 20),
    );
    expect(result.current.hasNextPage).toBe(true);
  });

  it("hasNextPage is false on the last page and fetchNextPage then makes no provider call", async () => {
    const { wrapper, getList } = makeWrapper();
    const { result } = renderHook(
      () =>
        useInfiniteGetList<typeof resources, "posts">("posts", {
          pagination: { page: 1, perPage: 10 },
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(result.current.hasNextPage).toBe(false);

    getList.mockClear();
    await act(() => result.current.fetchNextPage());
    expect(getList).not.toHaveBeenCalled();
    expect(result.current.data?.pages).toHaveLength(3);
  });

  it("reports a provider failure as an error", async () => {
    const { wrapper, getList } = makeWrapper();
    getList.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(
      () =>
        useInfiniteGetList<typeof resources, "posts">("posts", {
          pagination: { page: 1, perPage: 10 },
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.data).toBeUndefined();
  });

  it("does not fetch while enabled is false", async () => {
    const { wrapper, getList } = makeWrapper();
    const { result } = renderHook(
      () =>
        useInfiniteGetList<typeof resources, "posts">(
          "posts",
          { pagination: { page: 1, perPage: 10 } },
          { enabled: false },
        ),
      { wrapper },
    );
    await act(async () => {});
    expect(getList).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useInfiniteListController", () => {
  const render = (wrapper: ReturnType<typeof makeWrapper>["wrapper"]) =>
    renderHook(
      () => useInfiniteListController<typeof resources, "posts">("posts"),
      { wrapper },
    );

  it("exposes the flattened rows and fetchNextPage appends the next page", async () => {
    const { wrapper } = makeWrapper();
    const { result } = render(wrapper);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.map((r) => r.id)).toEqual(range(1, 10));
    expect(result.current.total).toBe(25);
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await waitFor(() =>
      expect(result.current.data?.map((r) => r.id)).toEqual(range(1, 20)),
    );
    expect(result.current.page).toBe(1);
    expect(result.current.isFetchingNextPage).toBe(false);
  });

  it("hasNextPage is false after the last page and fetchNextPage calls the provider no more", async () => {
    const { wrapper, getList } = makeWrapper();
    const { result } = render(wrapper);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await act(() => result.current.fetchNextPage());
    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data).toHaveLength(25));
    expect(result.current.hasNextPage).toBe(false);

    getList.mockClear();
    await act(() => result.current.fetchNextPage());
    expect(getList).not.toHaveBeenCalled();
    expect(result.current.data).toHaveLength(25);
  });

  it("setFilters restarts from page 1", async () => {
    const { wrapper, getList } = makeWrapper();
    const { result } = render(wrapper);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data).toHaveLength(20));

    act(() => result.current.setFilters({ group: "a" }));
    await waitFor(() =>
      expect(result.current.data?.map((r) => r.id)).toEqual(
        range(0, 9).map((i) => i * 2 + 1),
      ),
    );
    expect(result.current.total).toBe(13);
    expect(result.current.hasNextPage).toBe(true);
    const lastCall = getList.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({
      filter: { group: "a" },
      pagination: { page: 1 },
    });
  });

  it("unmount releases every observer", async () => {
    const { wrapper, queryClient } = makeWrapper();
    const { result, unmount } = render(wrapper);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await act(() => result.current.fetchNextPage());
    expect(observerCount(queryClient)).toBeGreaterThan(0);
    unmount();
    expect(observerCount(queryClient)).toBe(0);
  });

  it("UseInfiniteListControllerResult is assignable to ListContextValue", () => {
    expectTypeOf<
      UseInfiniteListControllerResult<Post>
    >().toExtend<ListContextValue>();
  });
});

function InfiniteList({ children }: { children: ReactNode }) {
  const list = useInfiniteListController<typeof resources, "posts">("posts");
  return <ListContextProvider value={list}>{children}</ListContextProvider>;
}

function PlainList({ children }: { children: ReactNode }) {
  const list = useListController<typeof resources, "posts">("posts", {
    syncWithLocation: false,
  });
  return <ListContextProvider value={list}>{children}</ListContextProvider>;
}

describe("useInfiniteListContext", () => {
  it("returns the infinite fields under an infinite list and throws under a plain list", async () => {
    const { wrapper: Chelone } = makeWrapper();
    const under = (List: typeof InfiniteList) => ({
      wrapper: ({ children }: { children: ReactNode }) => (
        <Chelone>
          <List>{children}</List>
        </Chelone>
      ),
    });

    const infinite = renderHook(
      () => useInfiniteListContext(),
      under(InfiniteList),
    );
    await waitFor(() => expect(infinite.result.current.isPending).toBe(false));
    expect(infinite.result.current.hasNextPage).toBe(true);
    expect(infinite.result.current.isFetchingNextPage).toBe(false);
    await act(() => infinite.result.current.fetchNextPage());
    await waitFor(() => expect(infinite.result.current.data).toHaveLength(20));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() =>
        renderHook(() => useInfiniteListContext(), under(PlainList)),
      ).toThrow(
        "useInfiniteListContext: the ambient list is not an infinite list",
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
