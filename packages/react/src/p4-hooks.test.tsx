import {
  createNotificationStore,
  createStore,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import {
  Activity,
  Component,
  type ReactNode,
  StrictMode,
  Suspense,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import {
  useCreateController,
  useDeleteController,
  useEditController,
  useListController,
  useShowController,
} from "./controller-hooks";
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
  const store = createStore();
  const setItem = vi.spyOn(store, "setItem");
  const inner = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
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
  return {
    wrapper,
    notifications,
    queryClient,
    dataProvider,
    getList,
    store,
    setItem,
  };
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

  it("unmount releases the controller's resources (last-unsubscribe detach, no act warnings)", async () => {
    const { wrapper, queryClient } = makeWrapper();
    const { result, unmount } = renderHook(
      () => useListController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    // useSyncExternalStore's unsubscribe is the LAST subscriber leaving —
    // the detach teardown must release the QueryObserver.
    unmount();
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
      // StrictMode: the useState initializer double-runs (one discarded INERT
      // controller — garbage, not a zombie) and the subscription runs
      // sub/unsub/sub (attach -> detach -> re-attach on the SAME controller).
      // The second attach must refetch/reattach correctly and settle.
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
      // Exactly ONE live observer — the discarded-render controller acquired
      // nothing, and the detach/re-attach cycle left no extra subscription.
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

  it("recovers from effect teardown without unmount (Activity hide/show — detach/re-attach)", async () => {
    // <Activity mode="hidden"> cleans up effects while PRESERVING hook state —
    // the same cleanup->re-setup cycle StrictMode simulates in dev. Hiding
    // detaches (last unsubscribe releases the observer + KV subscriptions);
    // revealing re-attaches the SAME controller with options rebuilt from
    // current state — no recreate, no dead snapshots.
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

    view.rerender(ui("hidden")); // effects torn down -> last unsubscribe -> detach
    await waitFor(() => expect(observerCount(queryClient)).toBe(0));

    view.rerender(ui("visible")); // effects re-run -> re-attach (same controller)
    await waitFor(() => expect(observerCount(queryClient)).toBe(1));
    await waitFor(() => expect(latest.current?.isPending).toBe(false));
    expect(latest.current?.data?.length).toBe(10);

    // The re-attached controller's actions are live.
    act(() => latest.current?.setPage(2));
    await waitFor(() => expect(latest.current?.data?.length).toBe(2));
    expect(latest.current?.page).toBe(2);

    view.unmount();
    expect(observerCount(queryClient)).toBe(0);
  });
});

describe("discarded-render leak regression (Task 4R gate finding)", () => {
  type ListResult = ReturnType<
    typeof useListController<typeof resources, "posts">
  >;

  function makeProbe() {
    const latest: { current: ListResult | null } = { current: null };
    function Probe() {
      latest.current = useListController<typeof resources, "posts">("posts");
      return null;
    }
    return { latest, Probe };
  }

  it("Suspense sibling suspending on initial mount: discarded renders leak no controllers and write no KV", async () => {
    const { wrapper: Wrapper, queryClient, setItem } = makeWrapper();
    const { latest, Probe } = makeProbe();
    let release!: () => void;
    let resolved = false;
    const gate = new Promise<void>((r) => {
      release = () => {
        resolved = true;
        r();
      };
    });
    function Suspender() {
      if (!resolved) throw gate;
      return null;
    }
    const view = render(
      <Wrapper>
        <Suspense fallback={null}>
          <Probe />
          <Suspender />
        </Suspense>
      </Wrapper>,
    );
    await act(async () => {
      release();
      await gate;
    });
    await waitFor(() => expect(latest.current?.isPending).toBe(false));
    expect(latest.current?.data?.length).toBe(10);
    // Exactly ONE live controller is attached — controllers constructed in
    // discarded renders are inert garbage, not zombies.
    expect(observerCount(queryClient)).toBe(1);
    view.unmount();
    // Gate reproduction: 2 zombie QueryObservers survived here pre-redesign.
    expect(observerCount(queryClient)).toBe(0);
    // Discarded controllers wrote nothing to the shared KV store.
    expect(setItem).not.toHaveBeenCalled();
  });

  it("initial-hidden <Activity>: the pre-rendered controller acquires nothing until reveal", async () => {
    const { wrapper: Wrapper, queryClient, getList } = makeWrapper();
    const { latest, Probe } = makeProbe();
    const ui = (mode: "visible" | "hidden") => (
      <Wrapper>
        <Activity mode={mode}>
          <Probe />
        </Activity>
      </Wrapper>
    );
    const view = render(ui("hidden"));
    await act(async () => {});
    // The hidden pre-render constructed a controller; construction is inert.
    // Gate reproduction: 1 zombie QueryObserver leaked here pre-redesign.
    expect(observerCount(queryClient)).toBe(0);
    expect(getList).not.toHaveBeenCalled();
    view.rerender(ui("visible")); // reveal -> effects mount -> attach
    await waitFor(() => expect(latest.current?.isPending).toBe(false));
    expect(latest.current?.data?.length).toBe(10);
    expect(observerCount(queryClient)).toBe(1);
    view.unmount();
    expect(observerCount(queryClient)).toBe(0);
  });

  it("a render throwing AFTER controller creation never commits and leaks nothing; a clean mount then works", async () => {
    // React logs boundary-caught errors via console.error — keep output clean.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const latest: { current: ListResult | null } = { current: null };
      let explode = true;
      function Exploding() {
        latest.current = useListController<typeof resources, "posts">("posts");
        if (explode) throw new Error("discarded-render");
        return null;
      }
      class Boundary extends Component<
        { children: ReactNode },
        { failed: boolean }
      > {
        state = { failed: false };
        static getDerivedStateFromError() {
          return { failed: true };
        }
        render() {
          return this.state.failed ? null : this.props.children;
        }
      }
      const first = makeWrapper();
      const FirstWrapper = first.wrapper;
      const view = render(
        <FirstWrapper>
          <Boundary>
            <Exploding />
          </Boundary>
        </FirstWrapper>,
      );
      await act(async () => {});
      // The discarded render's controller acquired nothing.
      expect(observerCount(first.queryClient)).toBe(0);
      expect(first.setItem).not.toHaveBeenCalled();
      view.unmount();

      explode = false;
      const second = makeWrapper();
      const SecondWrapper = second.wrapper;
      const clean = render(
        <SecondWrapper>
          <Boundary>
            <Exploding />
          </Boundary>
        </SecondWrapper>,
      );
      await waitFor(() => expect(latest.current?.isPending).toBe(false));
      expect(latest.current?.data?.length).toBe(10);
      expect(observerCount(second.queryClient)).toBe(1);
      clean.unmount();
      expect(observerCount(second.queryClient)).toBe(0);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("useEditController", () => {
  it("loads the record; save updates it and pushes the success notification", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => ({
        edit: useEditController<typeof resources, "posts">("posts", { id: 1 }),
        notifications: useNotifications(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.edit.isPending).toBe(false));
    expect(result.current.edit.record?.title).toBe("t1");

    await act(async () => {
      const fieldErrors = await result.current.edit.save({ title: "b" });
      expect(fieldErrors).toBeUndefined();
    });
    // onSettled invalidation refetches the getOne — the hook state converges.
    await waitFor(() => expect(result.current.edit.record?.title).toBe("b"));
    expect(
      result.current.notifications.some(
        (n) =>
          n.message === "chelone.notification.updated" &&
          n.type === "success" &&
          n.messageArgs?.smart_count === 1,
      ),
    ).toBe(true);
  });
});

describe("useShowController", () => {
  it("loads the record", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useShowController<typeof resources, "posts">("posts", { id: 2 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.record).toMatchObject({ id: 2, title: "t2" });
    expect(result.current.error).toBeNull();
  });
});

describe("useCreateController", () => {
  it("save creates the record and requests a redirect to the new record's edit view", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const onRedirect = vi.fn();
    const { result } = renderHook(
      () =>
        useCreateController<typeof resources, "posts">("posts", { onRedirect }),
      { wrapper },
    );
    // Nothing to fetch: never pending.
    expect(result.current.isPending).toBe(false);

    await act(async () => {
      const fieldErrors = await result.current.save({ title: "brand new" });
      expect(fieldErrors).toBeUndefined();
    });
    // Redirect matrix (behavior 10): create -> edit of the NEW record.
    expect(onRedirect).toHaveBeenCalledWith(
      "edit",
      "posts",
      expect.anything(),
      expect.objectContaining({ title: "brand new" }),
    );
    const newId = onRedirect.mock.calls[0]?.[2];
    expect((await dataProvider.getOne("posts", { id: newId })).data.title).toBe(
      "brand new",
    );
  });
});

describe("useDeleteController", () => {
  it("deleteOne removes the record", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const { result } = renderHook(
      () => useDeleteController<typeof resources, "posts">("posts"),
      { wrapper },
    );
    expect(result.current.saving).toBe(false);

    await act(async () => {
      const fieldErrors = await result.current.deleteOne(3);
      expect(fieldErrors).toBeUndefined();
    });
    await expect(dataProvider.getOne("posts", { id: 3 })).rejects.toThrow(
      /not found/,
    );
    expect(result.current.saving).toBe(false);
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

  it("useNotify throws and useNotifications returns an empty queue when no notification store is provided", () => {
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
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current).toEqual([]);
  });
});
