/**
 * R3 probe (react): mode NON-REGRESSION + `beforeunload` commit guard.
 *
 * These lock the invariants the undoable work must NOT have regressed:
 * - a PESSIMISTIC (default) mutation calls the server IMMEDIATELY, exactly once,
 *   and enqueues no undoable notification;
 * - an OPTIMISTIC mutation patches the cache synchronously AND calls the server
 *   exactly once (no deferral, no Undo);
 * - the `<Notification>` `beforeunload` guard commits a still-pending undoable
 *   so the server is never left behind the optimistic cache — asserted via the
 *   dataProvider spy (called once) and the pending-undoable registry draining.
 *
 * Every server-facing assertion checks an explicit SPY COUNT.
 */

import {
  commitAllUndoables,
  createI18n,
  createNotificationStore,
  defineMessages,
  defineResources,
  fakeDataProvider,
  hasPendingUndoables,
  oneKey,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Notification } from "./components/admin/feedback/notification";
import { CheloneProvider } from "./context";
import { useDelete, useUpdate } from "./hooks";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type R = typeof resources;

afterEach(async () => {
  cleanup();
  // Drain any handle a test left pending so the module registry stays clean.
  await commitAllUndoables();
});

function makeSetup() {
  const dataProvider = fakeDataProvider<R>({
    posts: [
      { id: 1, title: "One", views: 10 },
      { id: 2, title: "Two", views: 20 },
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const notifications = createNotificationStore();
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.undo": "Undo",
        "chelone.notification.deleted": "Element deleted",
        "chelone.notification.updated": "Element updated",
        "chelone.notification.http_error": "Server error",
      }),
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      notifications={notifications}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
  return { dataProvider, queryClient, notifications, wrapper };
}

describe("mode non-regression — pessimistic (default)", () => {
  it("useDelete default calls the server IMMEDIATELY, exactly once, no undoable notice", async () => {
    const { dataProvider, notifications, wrapper } = makeSetup();
    const del = vi.spyOn(dataProvider, "delete");
    const notify = vi.spyOn(notifications, "notify");
    const { result } = renderHook(() => useDelete<R, "posts">("posts"), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate({
        id: 1,
        previousData: { id: 1, title: "One", views: 10 },
      });
    });

    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith("posts", {
      id: 1,
      previousData: { id: 1, title: "One", views: 10 },
    });
    // Pessimistic never routes through the undoable notification.
    expect(notify.mock.calls.some((c) => c[1]?.undoable)).toBe(false);
    expect(hasPendingUndoables()).toBe(false);
  });

  it("useUpdate default calls the server exactly once", async () => {
    const { dataProvider, wrapper } = makeSetup();
    const update = vi.spyOn(dataProvider, "update");
    const { result } = renderHook(() => useUpdate<R, "posts">("posts"), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate({ id: 1, data: { views: 99 } });
    });

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });
});

describe("mode non-regression — optimistic", () => {
  it("useUpdate optimistic patches the cache synchronously AND calls the server once", async () => {
    const { dataProvider, queryClient, wrapper } = makeSetup();
    // Optimistic onMutate patches the oneKey cache entry; seed it.
    queryClient.setQueryData(oneKey("posts", { id: 1 }), {
      id: 1,
      title: "One",
      views: 10,
    });
    const update = vi.spyOn(dataProvider, "update");
    const { result } = renderHook(
      () => useUpdate<R, "posts">("posts", { mutationMode: "optimistic" }),
      { wrapper },
    );

    await act(async () => {
      result.current.mutate({ id: 1, data: { views: 0 } });
    });

    // Cache patched (optimistic), server hit exactly once.
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ views: number }>(oneKey("posts", { id: 1 }))
          ?.views,
      ).toBe(0),
    );
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });

  it("useDelete optimistic removes the row synchronously AND calls the server once", async () => {
    const { dataProvider, queryClient, wrapper } = makeSetup();
    queryClient.setQueryData(oneKey("posts", { id: 1 }), {
      id: 1,
      title: "One",
      views: 10,
    });
    const del = vi.spyOn(dataProvider, "delete");
    const { result } = renderHook(
      () => useDelete<R, "posts">("posts", { mutationMode: "optimistic" }),
      { wrapper },
    );

    await act(async () => {
      result.current.mutate({
        id: 1,
        previousData: { id: 1, title: "One", views: 10 },
      });
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData(oneKey("posts", { id: 1 })),
      ).toBeUndefined(),
    );
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
  });
});

describe("beforeunload commit guard", () => {
  it("a pending undoable is committed (server called once) when the page unloads", async () => {
    const { dataProvider, wrapper } = makeSetup();
    const del = vi.spyOn(dataProvider, "delete");

    // Mount <Notification> so its beforeunload listener is wired.
    render(<Notification />, { wrapper });

    // Start an undoable delete: server DEFERRED, registry now pending.
    const { result } = renderHook(
      () => useDelete<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    act(() => {
      result.current.mutate({
        id: 1,
        previousData: { id: 1, title: "One", views: 10 },
      });
    });
    expect(hasPendingUndoables()).toBe(true);
    expect(del).not.toHaveBeenCalled();

    // Page unloads before the Undo window closes.
    await act(async () => {
      window.dispatchEvent(new Event("beforeunload"));
      // Flush the commitAllUndoables() microtasks.
      await Promise.resolve();
      await Promise.resolve();
    });

    // The guard committed the pending mutation exactly once and drained it.
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith("posts", {
      id: 1,
      previousData: { id: 1, title: "One", views: 10 },
    });
    expect(hasPendingUndoables()).toBe(false);
  });

  it("wires and tears down the beforeunload listener with the <Notification> lifecycle", () => {
    const { wrapper } = makeSetup();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<Notification />, { wrapper });
    expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(true);

    unmount();
    expect(remove.mock.calls.some(([type]) => type === "beforeunload")).toBe(
      true,
    );
  });
});
