import {
  createNotificationStore,
  createStore,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { Activity, type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import { useListController } from "./controller-hooks";
import { useNotifications, useNotify } from "./notification-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
const rows = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

function makeWrapper({ strict = false }: { strict?: boolean } = {}) {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const getList = vi.spyOn(dataProvider, "getList");
  const inner = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={createStore()}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  const wrapper = strict
    ? ({ children }: { children: ReactNode }) => (
        <StrictMode>{inner({ children })}</StrictMode>
      )
    : inner;
  return { wrapper, notifications, queryClient, getList };
}

/** Live QueryObserver subscriptions across the whole cache. */
function observerCount(queryClient: QueryClient): number {
  return queryClient
    .getQueryCache()
    .getAll()
    .reduce((sum, query) => sum + query.getObserversCount(), 0);
}

describe("useListController", () => {
  it("loads data and paginates through actions", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.length).toBe(10);
    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.data?.length).toBe(2));
    expect(result.current.page).toBe(2);
  });

  it("action identities are stable across renders", async () => {
    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    const setPage1 = result.current.setPage;
    rerender();
    expect(result.current.setPage).toBe(setPage1);
  });

  it("unmount destroys the controller (no state updates after unmount, no act warnings)", async () => {
    const { wrapper, queryClient } = makeWrapper();
    const { result, unmount } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    unmount(); // destroy must tear down the QueryObserver — vitest fails on unhandled act() warnings
    expect(observerCount(queryClient)).toBe(0);
  });

  it("StrictMode double-mount settles with correct data, one live observer, no leaks, no act warnings", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { wrapper, queryClient, getList } = makeWrapper({ strict: true });
      const { result, unmount } = renderHook(
        () => useListController<typeof resources, "posts">("posts"),
        { wrapper },
      );
      // Mount/destroy/remount path: the hook must recover from StrictMode's
      // simulated unmount (which destroys the first controller) and settle.
      await waitFor(() => expect(result.current.isPending).toBe(false));
      expect(result.current.data?.length).toBe(10);
      act(() => result.current.setPage(2));
      await waitFor(() => expect(result.current.page).toBe(2));
      expect(result.current.data?.length).toBe(2);
      // No double-fetch beyond the query cache's dedupe on initial mount.
      expect(
        getList.mock.calls.filter(
          ([, p]) =>
            p.pagination && "page" in p.pagination && p.pagination.page === 1,
        ),
      ).toHaveLength(1);
      // Exactly ONE live controller remains subscribed — the StrictMode
      // first-mount controller was destroyed and did not leak its observer.
      expect(observerCount(queryClient)).toBe(1);
      unmount();
      expect(observerCount(queryClient)).toBe(0);
      // No act()/update-after-unmount warnings surfaced by React.
      const reactWarnings = errorSpy.mock.calls.filter((args) =>
        String(args[0]).includes("act("),
      );
      expect(reactWarnings).toHaveLength(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("recovers from effect teardown without unmount (Activity hide/show — the remount path)", async () => {
    // <Activity mode="hidden"> cleans up effects while PRESERVING hook state —
    // the same cleanup->re-setup cycle StrictMode simulates in dev. The hook's
    // cleanup destroys the controller; on re-show it must detect the destroyed
    // controller, rebuild a fresh one, and resubscribe — no dead snapshots.
    const { wrapper: Wrapper, queryClient } = makeWrapper();
    const latest: {
      current: ReturnType<
        typeof useListController<typeof resources, "posts">
      > | null;
    } = { current: null };
    function Probe() {
      latest.current = useListController<typeof resources, "posts">("posts");
      return null;
    }
    const ui = (mode: "visible" | "hidden") => (
      <Wrapper>
        <Activity mode={mode}>
          <Probe />
        </Activity>
      </Wrapper>
    );
    const view = render(ui("visible"));
    await waitFor(() => expect(latest.current?.isPending).toBe(false));
    expect(latest.current?.data?.length).toBe(10);
    expect(observerCount(queryClient)).toBe(1);

    view.rerender(ui("hidden")); // effects torn down -> controller destroyed
    await waitFor(() => expect(observerCount(queryClient)).toBe(0));

    view.rerender(ui("visible")); // effects re-run -> fresh controller
    await waitFor(() => expect(observerCount(queryClient)).toBe(1));
    await waitFor(() => expect(latest.current?.isPending).toBe(false));
    expect(latest.current?.data?.length).toBe(10);

    // The fresh controller's actions are live, not the destroyed one's.
    act(() => latest.current?.setPage(2));
    await waitFor(() => expect(latest.current?.data?.length).toBe(2));
    expect(latest.current?.page).toBe(2);

    view.unmount();
    expect(observerCount(queryClient)).toBe(0);
  });
});

describe("notifications", () => {
  it("useNotify pushes into the shared store; useNotifications sees it", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => ({ notify: useNotify(), list: useNotifications() }),
      { wrapper },
    );
    act(
      () =>
        void result.current.notify("chelone.notification.updated", {
          type: "success",
        }),
    );
    await waitFor(() => expect(result.current.list.length).toBe(1));
    expect(result.current.list[0]?.message).toBe(
      "chelone.notification.updated",
    );
  });

  it("both hooks throw clear errors when no notification store is provided", () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CheloneProvider
        dataProvider={fakeDataProvider<typeof resources>({ posts: [] })}
        queryClient={queryClient}
      >
        {children}
      </CheloneProvider>
    );
    expect(() => renderHook(() => useNotify(), { wrapper })).toThrow(
      /notification/i,
    );
    expect(() => renderHook(() => useNotifications(), { wrapper })).toThrow(
      /notification/i,
    );
  });
});
