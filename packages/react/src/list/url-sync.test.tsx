/**
 * URL-sync (`syncWithLocation`) for `useListController` — R1 Task 2.
 *
 * Mirrors react-admin's `useListParams`: a top-level resource list reads its
 * initial params from the location query string on mount (deep-linkable) and
 * pushes every param change back to the URL with `replace: true`. An embedded
 * / reference list opts out via `syncWithLocation: false` (or by rendering
 * without a router adapter — the graceful degrade path all pre-router tests
 * already exercise), keeping the pure store/KV behavior.
 */
import {
  createNotificationStore,
  createStore,
  defineResources,
  fakeDataProvider,
  type NavigateOpts,
  parseLocation,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "../context";
import { useListController } from "../controller-hooks";
import type { AdapterLinkProps, RouterAdapter } from "../router/adapter";
import { RouterAdapterProvider } from "../router/adapter";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
const rows = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

/**
 * A minimal `RouterAdapter` whose `useLocation`/`useNavigate` are real; the
 * remaining members are inert stubs (the list hook touches only those two).
 * `navigate` mutates the closed-over `search`, so a follow-up render observes
 * the pushed query; `setSearch` stands in for back/forward or a followed link.
 * Its one signature takes both `AdapterNavigate` overloads' arguments (a string
 * `to` or a delta), which is what makes it assignable to the contract.
 */
function makeMockAdapter(initialSearch = "") {
  let search = initialSearch;
  const navigate = vi.fn((to: string | number, _opts?: NavigateOpts) => {
    if (typeof to === "number") return;
    const q = to.indexOf("?");
    search = q >= 0 ? to.slice(q) : "";
  });
  const adapter: RouterAdapter = {
    useLocation: () => parseLocation(`/posts${search}`),
    useNavigate: () => navigate,
    useParams: () => ({}),
    useBlocker: () => ({
      state: "unblocked",
      proceed: () => {},
      reset: () => {},
      location: null,
    }),
    useMatch: () => null,
    useInRouterContext: () => true,
    useCanBlock: () => false,
    // Two params (props, ref) — React warns about a one-parameter render.
    Link: forwardRef<HTMLAnchorElement, AdapterLinkProps>(
      ({ children }, _ref) => children,
    ),
    Navigate: () => null,
    Route: () => null,
    Routes: () => null,
    Outlet: () => null,
    matchPath: () => null,
    RouterWrapper: ({ children }) => children,
  };
  return {
    adapter,
    navigate,
    getSearch: () => search,
    setSearch: (next: string) => {
      search = next;
    },
  };
}

function makeWrapper(adapter?: RouterAdapter) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const store = createStore();
  const notifications = createNotificationStore();
  const wrapper = ({ children }: { children: ReactNode }) => {
    const inner = (
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        store={store}
        notifications={notifications}
      >
        {children}
      </CheloneProvider>
    );
    return adapter ? (
      <RouterAdapterProvider adapter={adapter}>{inner}</RouterAdapterProvider>
    ) : (
      inner
    );
  };
  return { wrapper };
}

describe("useListController URL-sync (syncWithLocation)", () => {
  it("seeds initial params from a deep-linked URL on mount", async () => {
    const { adapter } = makeMockAdapter("?page=3&perPage=5");
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    // Params are seeded synchronously at mount — no fetch needed to observe.
    expect(result.current.page).toBe(3);
    expect(result.current.perPage).toBe(5);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    // The first fetch used the deep-linked page (records 11..15).
    expect(result.current.data?.map((r) => r.id)).toEqual([11, 12, 13, 14, 15]);
  });

  it("seeds filter + sort from a deep-linked URL on mount", async () => {
    const { adapter } = makeMockAdapter(
      `?filter=${encodeURIComponent(
        JSON.stringify({ title: "t7" }),
      )}&sort=title&order=DESC`,
    );
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    expect(result.current.filter).toEqual({ title: "t7" });
    expect(result.current.sort).toEqual([{ field: "title", order: "DESC" }]);
  });

  it("a deep-linked sort on the default sort field keeps its order", () => {
    const { adapter } = makeMockAdapter("?sort=title&order=ASC");
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () =>
        useListController<typeof resources, "posts">("posts", {
          sort: { field: "title", order: "ASC" },
        }),
      { wrapper },
    );
    expect(result.current.sort).toEqual([{ field: "title", order: "ASC" }]);
  });

  it("pushes a param change to the URL with replace:true", async () => {
    const { adapter, navigate } = makeMockAdapter();
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    navigate.mockClear();
    act(() => result.current.setFilters({ title: "t9" }));
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    const lastCall = navigate.mock.calls.at(-1);
    const to = defined(lastCall)[0];
    if (typeof to !== "string") throw new Error("Expected a URL navigation");
    const opts = lastCall?.[1];
    expect(opts?.replace).toBe(true);
    expect(to).toContain("filter=");
    expect(decodeURIComponent(to)).toContain('{"title":"t9"}');
  });

  it("pushes page changes to the URL", async () => {
    const { adapter, navigate } = makeMockAdapter();
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    navigate.mockClear();
    act(() => result.current.setPage(2));
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    const to = defined(navigate.mock.calls.at(-1))[0];
    if (typeof to !== "string") throw new Error("Expected a URL navigation");
    expect(to).toContain("page=2");
  });

  it("does NOT touch the URL on mount (clean deep-link stays clean)", async () => {
    const { adapter, navigate } = makeMockAdapter();
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("a later location change re-seeds the params (back/forward)", async () => {
    const { adapter, setSearch } = makeMockAdapter("?page=2&perPage=5");
    const { wrapper } = makeWrapper(adapter);
    const { result, rerender } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    setSearch("?page=4&perPage=5");
    rerender();
    expect(result.current.page).toBe(4);
    await waitFor(() =>
      expect(result.current.data?.map((r) => r.id)).toEqual([
        16, 17, 18, 19, 20,
      ]),
    );

    setSearch("?page=2&perPage=5");
    rerender();
    expect(result.current.page).toBe(2);
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  it("its own push does not re-seed or navigate again", async () => {
    const { adapter, navigate } = makeMockAdapter();
    const { wrapper } = makeWrapper(adapter);
    const { result, rerender } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    act(() => result.current.setPage(2));
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    rerender();
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.page).toBe(2);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("syncWithLocation:false leaves the URL untouched", async () => {
    const { adapter, navigate } = makeMockAdapter();
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () =>
        useListController<typeof resources, "posts">("posts", {
          syncWithLocation: false,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    act(() => result.current.setFilters({ title: "t9" }));
    await waitFor(() => expect(result.current.filter).toEqual({ title: "t9" }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("syncWithLocation:false ignores a deep-linked URL (keeps defaults)", async () => {
    const { adapter } = makeMockAdapter("?page=3");
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () =>
        useListController<typeof resources, "posts">("posts", {
          syncWithLocation: false,
        }),
      { wrapper },
    );
    expect(result.current.page).toBe(1);
  });

  it("no router adapter -> pure store behavior, never throws", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.page).toBe(2));
    expect(result.current.data?.length).toBe(10);
  });

  it("setParams with filter, sort and perPage navigates once", async () => {
    const { adapter, navigate } = makeMockAdapter();
    const { wrapper } = makeWrapper(adapter);
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    navigate.mockClear();
    act(() =>
      result.current.setParams({
        filter: { title: "t1" },
        sort: { field: "title", order: "DESC" },
        perPage: 5,
      }),
    );
    await waitFor(() => expect(result.current.perPage).toBe(5));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.filter).toEqual({ title: "t1" });
    expect(result.current.sort).toEqual([{ field: "title", order: "DESC" }]);
    expect(result.current.page).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    const destination = defined(navigate.mock.calls[0])[0];
    if (typeof destination !== "string")
      throw new Error("Expected a URL navigation");
    const to = decodeURIComponent(destination);
    expect(to).toContain('{"title":"t1"}');
    expect(to).toContain("sort=title");
    expect(to).toContain("order=DESC");
    expect(to).toContain("perPage=5");
    expect(navigate.mock.calls[0]?.[1]?.replace).toBe(true);
  });
});
