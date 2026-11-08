/**
 * R3-T2 tests: UNDOABLE mutation wiring in @chelone/react.
 *
 * Proves the data-integrity invariants of the optimistic-with-Undo flow for the
 * `<DeleteButton>`, `<BulkDeleteButton>` and `<BulkUpdateButton>`:
 * - the change is applied to the query cache IMMEDIATELY (optimistic);
 * - the dataProvider is NOT called while the Undo window is open;
 * - clicking Undo rolls the cache back and the provider is NEVER called (0×);
 * - letting the window close COMMITS: the provider is called EXACTLY once;
 * - a commit error rolls the cache back and notifies the error.
 *
 * The undoable notification's `undo`/`onClose` callbacks (the Undo action and
 * the auto-hide/dismiss commit) are captured off the notification store's
 * `notify` spy, so the integrity assertions are deterministic — the sonner
 * render + timer wiring is covered separately in `notification.test.tsx`.
 */

import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type GetListResult,
  listKey,
  type NotificationStore,
  type NotifyOptions,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { makeListContext } from "../../../__fixtures__/list-context";
import { CheloneProvider } from "../../../context";
import { ListContextProvider } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { BulkDeleteButton } from "./bulk-delete-button";
import { BulkUpdateButton } from "./bulk-update-button";
import { DeleteButton } from "./delete-button";

afterEach(cleanup);

const listParams = {
  pagination: { page: 1, perPage: 100 },
  sort: { field: "id", order: "ASC" as const },
  filter: {},
};

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.delete": "Delete",
        "chelone.action.update": "Update",
        "chelone.action.undo": "Undo",
        "chelone.notification.deleted": "Element deleted",
        "chelone.notification.updated": "Element updated",
        "chelone.notification.http_error": "Server error",
      }),
    },
  });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [
      { id: 1, title: "One", views: 10 },
      { id: 2, title: "Two", views: 20 },
      { id: 3, title: "Three", views: 30 },
    ],
  });
}

function seedListCache(qc: QueryClient) {
  qc.setQueryData<GetListResult>(listKey("posts", listParams), {
    data: [
      { id: 1, title: "One", views: 10 },
      { id: 2, title: "Two", views: 20 },
      { id: 3, title: "Three", views: 30 },
    ],
    total: 3,
  });
}

function cachedIds(qc: QueryClient): (string | number)[] {
  const list = qc.getQueryData<GetListResult>(listKey("posts", listParams));
  return (list?.data ?? []).map((r) => r.id);
}

/** The undoable notification options captured off the store's `notify` spy. */
function captureUndoable(
  notify: MockInstance<NotificationStore["notify"]>,
): NotifyOptions {
  const call = notify.mock.calls.find((args) => args[1]?.undoable);
  if (!call) throw new Error("no undoable notification was enqueued");
  const options = call[1];
  if (!options) throw new Error("undoable notification had no options");
  return options;
}

function Providers({
  children,
  dataProvider,
  queryClient,
  notifications,
  selectedIds = [],
}: {
  children: ReactNode;
  dataProvider: DataProvider;
  queryClient: QueryClient;
  notifications: NotificationStore;
  selectedIds?: number[];
}) {
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: true,
    hasEdit: true,
    hasShow: true,
  });
  const listValue = makeListContext({ selectedIds });
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={makeI18n()}
      notifications={notifications}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/posts"]}>
            <ResourceContextProvider value="posts">
              <ListContextProvider value={listValue}>
                {children}
              </ListContextProvider>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("undoable <BulkDeleteButton>", () => {
  it("removes rows optimistically and defers the provider call", () => {
    const dataProvider = makeDataProvider();
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(queryClient);
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    render(
      <Providers
        dataProvider={dataProvider}
        queryClient={queryClient}
        notifications={notifications}
        selectedIds={[1, 3]}
      >
        <BulkDeleteButton mutationMode="undoable" />
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    });
    // Rows gone from the cache NOW; the server is untouched.
    expect(cachedIds(queryClient)).toEqual([2]);
    expect(deleteMany).not.toHaveBeenCalled();
    // An undoable notification was enqueued.
    const options = captureUndoable(notify);
    expect(options.undoable).toBe(true);
    expect(options.autoHideDuration).toBe(5000);
  });

  it("Undo restores the rows and NEVER calls the provider", () => {
    const dataProvider = makeDataProvider();
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(queryClient);
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    render(
      <Providers
        dataProvider={dataProvider}
        queryClient={queryClient}
        notifications={notifications}
        selectedIds={[1, 3]}
      >
        <BulkDeleteButton mutationMode="undoable" />
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    });
    const options = captureUndoable(notify);
    act(() => {
      options.undo?.();
    });
    expect(cachedIds(queryClient)).toEqual([1, 2, 3]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("commit calls the provider EXACTLY once", async () => {
    const dataProvider = makeDataProvider();
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(queryClient);
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    render(
      <Providers
        dataProvider={dataProvider}
        queryClient={queryClient}
        notifications={notifications}
        selectedIds={[1, 3]}
      >
        <BulkDeleteButton mutationMode="undoable" />
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    });
    const options = captureUndoable(notify);
    await act(async () => {
      options.onClose?.();
    });
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith("posts", { ids: [1, 3] });
    // A double close (belt-and-suspenders) still commits only once.
    await act(async () => {
      options.onClose?.();
    });
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it("commit error rolls the cache back and notifies the error", async () => {
    const dataProvider = makeDataProvider();
    vi.spyOn(dataProvider, "deleteMany").mockRejectedValue(new Error("boom"));
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(queryClient);
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    render(
      <Providers
        dataProvider={dataProvider}
        queryClient={queryClient}
        notifications={notifications}
        selectedIds={[1]}
      >
        <BulkDeleteButton mutationMode="undoable" />
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    });
    const options = captureUndoable(notify);
    await act(async () => {
      await options.onClose?.();
      // Flush the commit rejection microtask.
      await Promise.resolve();
    });
    // Rolled back to all three rows.
    expect(cachedIds(queryClient)).toEqual([1, 2, 3]);
    expect(notify).toHaveBeenCalledWith(
      "chelone.notification.http_error",
      expect.objectContaining({ type: "error" }),
    );
  });
});

describe("undoable <BulkUpdateButton>", () => {
  it("patches rows optimistically, then commits once", async () => {
    const dataProvider = makeDataProvider();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(queryClient);
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    render(
      <Providers
        dataProvider={dataProvider}
        queryClient={queryClient}
        notifications={notifications}
        selectedIds={[1, 2]}
      >
        <BulkUpdateButton mutationMode="undoable" data={{ views: 0 }} />
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /update/i }));
    });
    const list = queryClient.getQueryData<GetListResult>(
      listKey("posts", listParams),
    );
    expect(list?.data.find((r) => r.id === 1)?.views).toBe(0);
    expect(list?.data.find((r) => r.id === 3)?.views).toBe(30);
    expect(updateMany).not.toHaveBeenCalled();

    const options = captureUndoable(notify);
    await act(async () => {
      options.onClose?.();
    });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith("posts", {
      ids: [1, 2],
      data: { views: 0 },
    });
  });

  it("Undo restores the original values without calling the provider", () => {
    const dataProvider = makeDataProvider();
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(queryClient);
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    render(
      <Providers
        dataProvider={dataProvider}
        queryClient={queryClient}
        notifications={notifications}
        selectedIds={[1, 2]}
      >
        <BulkUpdateButton mutationMode="undoable" data={{ views: 0 }} />
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /update/i }));
    });
    const options = captureUndoable(notify);
    act(() => {
      options.undo?.();
    });
    const list = queryClient.getQueryData<GetListResult>(
      listKey("posts", listParams),
    );
    expect(list?.data.find((r) => r.id === 1)?.views).toBe(10);
    expect(list?.data.find((r) => r.id === 2)?.views).toBe(20);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("undoable <DeleteButton>", () => {
  it("deletes optimistically with no confirm dialog and defers the provider", () => {
    const dataProvider = makeDataProvider();
    const del = vi.spyOn(dataProvider, "delete");
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(queryClient);
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    render(
      <Providers
        dataProvider={dataProvider}
        queryClient={queryClient}
        notifications={notifications}
      >
        <RecordContextProvider value={{ id: 2, title: "Two" }}>
          <DeleteButton mutationMode="undoable" redirect={false} />
        </RecordContextProvider>
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    });
    // No confirm dialog — the record vanishes immediately.
    expect(screen.queryByRole("button", { name: /confirm/i })).toBeNull();
    expect(cachedIds(queryClient)).toEqual([1, 3]);
    expect(del).not.toHaveBeenCalled();
    const options = captureUndoable(notify);
    expect(options.undoable).toBe(true);
  });

  it("commit calls delete once; Undo calls it zero times", async () => {
    // Commit path.
    const dp1 = makeDataProvider();
    const del1 = vi.spyOn(dp1, "delete");
    const qc1 = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(qc1);
    const n1 = createNotificationStore();
    const notify1 = vi.spyOn(n1, "notify");
    const { unmount } = render(
      <Providers dataProvider={dp1} queryClient={qc1} notifications={n1}>
        <RecordContextProvider value={{ id: 2, title: "Two" }}>
          <DeleteButton mutationMode="undoable" redirect={false} />
        </RecordContextProvider>
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    });
    await act(async () => {
      captureUndoable(notify1).onClose?.();
    });
    expect(del1).toHaveBeenCalledTimes(1);
    expect(del1).toHaveBeenCalledWith("posts", {
      id: 2,
      previousData: { id: 2, title: "Two" },
    });
    unmount();

    // Undo path.
    const dp2 = makeDataProvider();
    const del2 = vi.spyOn(dp2, "delete");
    const qc2 = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedListCache(qc2);
    const n2 = createNotificationStore();
    const notify2 = vi.spyOn(n2, "notify");
    render(
      <Providers dataProvider={dp2} queryClient={qc2} notifications={n2}>
        <RecordContextProvider value={{ id: 2, title: "Two" }}>
          <DeleteButton mutationMode="undoable" redirect={false} />
        </RecordContextProvider>
      </Providers>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    });
    act(() => {
      captureUndoable(notify2).undo?.();
    });
    expect(cachedIds(qc2)).toEqual([1, 2, 3]);
    expect(del2).not.toHaveBeenCalled();
  });
});
