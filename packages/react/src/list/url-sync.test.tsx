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
  parseLocation,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "../context";
import { useListController } from "../controller-hooks";
import type { AdapterNavigate, RouterAdapter } from "../router/adapter";
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
 * the pushed query — enough to exercise the one-way (state -> URL) sync.
 */
function makeMockAdapter(initialSearch = "") {
  let search = initialSearch;
  const navigate = vi.fn(
    (to: string | number, _opts?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") return;
      const q = to.indexOf("?");
      search = q >= 0 ? to.slice(q) : "";
    },
  );
  const adapter: RouterAdapter = {
    useLocation: () => parseLocation(`/posts${search}`),
    useNavigate: () => navigate as unknown as AdapterNavigate,
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
    Link: (() => null) as unknown as RouterAdapter["Link"],
    Navigate: () => null,
    Route: () => null,
    Routes: () => null,
    Outlet: () => null,
    matchPath: () => null,
    RouterWrapper: ({ children }) => children,
  };
  return { adapter, navigate, getSearch: () => search };
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
    const to = lastCall?.[0] as string;
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
    const to = navigate.mock.calls.at(-1)?.[0] as string;
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
        sort: { field: "views", order: "DESC" },
        perPage: 5,
      }),
    );
    await waitFor(() => expect(result.current.perPage).toBe(5));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(navigate).toHaveBeenCalledTimes(1);
    const to = decodeURIComponent(navigate.mock.calls[0]?.[0] as string);
    expect(to).toContain('{"title":"t1"}');
    expect(to).toContain("sort=views");
    expect(to).toContain("order=DESC");
    expect(to).toContain("perPage=5");
    expect(navigate.mock.calls[0]?.[1]?.replace).toBe(true);
  });
});
