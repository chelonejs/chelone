import {
  createNotificationStore,
  defineResources,
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
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import {
  afterEach,
  describe,
  expect,
  expectTypeOf,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import {
  createCheloneHooks,
  useDelete,
  useDeleteMany,
  useGetList,
  useGetManyAggregate,
  useGetManyReference,
  useGetOne,
  useUpdate,
  useUpdateMany,
} from "./hooks";
import { Admin, Resource } from "./index";

afterEach(cleanup);

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: {
    schema: z.object({ id: z.number(), post_id: z.number(), body: z.string() }),
  },
});
type R = typeof resources;

function makeWrapper() {
  const dataProvider = fakeDataProvider<R>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
    comments: [
      { id: 1, post_id: 1, body: "x" },
      { id: 2, post_id: 2, body: "y" },
      { id: 3, post_id: 1, body: "z" },
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider dataProvider={dataProvider} queryClient={queryClient}>
      {children}
    </CheloneProvider>
  );
  return { wrapper, queryClient, dataProvider };
}

describe("react hooks", () => {
  it("useGetList resolves typed data through the provider", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetList<R, "posts">("posts"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map((p) => p.title)).toEqual(["a", "b"]);
  });

  it("useGetList refetches every refetchInterval ms", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const getList = vi.spyOn(dataProvider, "getList");
    renderHook(
      () => useGetList<R, "posts">("posts", {}, { refetchInterval: 30 }),
      { wrapper },
    );
    await waitFor(() => expect(getList.mock.calls.length).toBeGreaterThan(2));
  });

  it("useGetList does not poll with refetchInterval 0 or none", async () => {
    for (const options of [
      { refetchInterval: 0 },
      { refetchInterval: -30 },
      { refetchInterval: false as const },
      {},
    ]) {
      const { wrapper, dataProvider } = makeWrapper();
      const getList = vi.spyOn(dataProvider, "getList");
      const { result, unmount } = renderHook(
        () => useGetList<R, "posts">("posts", {}, options),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(getList).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it("useGetOne is served from the list-seeded cache shape", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetOne<R, "posts">("posts", { id: 1 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("a");
  });

  it("useUpdate mutates and the list refetches (invalidation)", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => ({
        list: useGetList<R, "posts">("posts"),
        update: useUpdate<R, "posts">("posts"),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    result.current.update.mutate({ id: 1, data: { title: "a2" } });
    await waitFor(() =>
      expect(
        result.current.list.data?.data.find((p) => p.id === 1)?.title,
      ).toBe("a2"),
    );
  });

  it("createCheloneHooks binds the registry type — data infers, bad names reject", async () => {
    const hooks = createCheloneHooks<R>();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => hooks.useGetList("posts"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectTypeOf(result.current.data?.data).toEqualTypeOf<
      { id: number; title: string }[] | undefined
    >();
    // @ts-expect-error unknown resource name rejected by the bound hooks
    void (() => hooks.useGetList("nope"));
  });

  it("useGetManyReference resolves the rows whose target field equals the id and reports the total", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useGetManyReference<R, "comments">("comments", {
          target: "post_id",
          id: 1,
          pagination: { page: 1, perPage: 10 },
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map((c) => c.body)).toEqual(["x", "z"]);
    expect(result.current.data?.total).toBe(2);
  });

  it("useGetManyReference does not fetch while enabled is false", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const spy = vi.spyOn(dataProvider, "getManyReference");
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useGetManyReference<R, "comments">(
          "comments",
          { target: "post_id", id: 1 },
          { enabled },
        ),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(spy).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("createCheloneHooks binds useGetManyReference to the registry type and rejects an unknown resource", async () => {
    const hooks = createCheloneHooks<R>();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => hooks.useGetManyReference("comments", { target: "post_id", id: 2 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectTypeOf(result.current.data?.data).toEqualTypeOf<
      { id: number; post_id: number; body: string }[] | undefined
    >();
    expect(result.current.data?.data.map((c) => c.body)).toEqual(["y"]);
    // @ts-expect-error unknown resource name rejected by the bound hooks
    void (() => hooks.useGetManyReference("nope", { target: "x", id: 1 }));
  });

  it("three useGetManyAggregate hooks mounted together make one getMany call and each gets only its own records", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const { result } = renderHook(
      () => ({
        first: useGetManyAggregate<R, "posts">("posts", { ids: [1] }),
        second: useGetManyAggregate<R, "posts">("posts", { ids: [2] }),
        both: useGetManyAggregate<R, "posts">("posts", { ids: [2, 1] }),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.first.isSuccess).toBe(true);
      expect(result.current.second.isSuccess).toBe(true);
      expect(result.current.both.isSuccess).toBe(true);
    });
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith("posts", { ids: [1, 2] });
    expect(result.current.first.data?.map((p) => p.title)).toEqual(["a"]);
    expect(result.current.second.data?.map((p) => p.title)).toEqual(["b"]);
    expect(result.current.both.data?.map((p) => p.title)).toEqual(["b", "a"]);
  });

  it("useGetManyAggregate does not fetch while enabled is false", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useGetManyAggregate<R, "posts">("posts", { ids: [1] }, { enabled }),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(getMany).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(result.current.data?.map((p) => p.title)).toEqual(["a"]);
  });

  it("useGetManyAggregate exposes a provider rejection as error on every hook in the batch", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockRejectedValue(new Error("boom"));
    const { result } = renderHook(
      () => ({
        first: useGetManyAggregate<R, "posts">("posts", { ids: [1] }),
        second: useGetManyAggregate<R, "posts">("posts", { ids: [2] }),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.first.isError).toBe(true);
      expect(result.current.second.isError).toBe(true);
    });
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(result.current.first.error?.message).toBe("boom");
    expect(result.current.second.error?.message).toBe("boom");
  });

  it("createCheloneHooks binds useGetManyAggregate to the registry type and rejects an unknown resource", async () => {
    const hooks = createCheloneHooks<R>();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => hooks.useGetManyAggregate("posts", { ids: [2] }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectTypeOf(result.current.data).toEqualTypeOf<
      { id: number; title: string }[] | undefined
    >();
    expect(result.current.data?.map((p) => p.title)).toEqual(["b"]);
    // @ts-expect-error unknown resource name rejected by the bound hooks
    void (() => hooks.useGetManyAggregate("nope", { ids: [1] }));
  });

  it("useCheloneContext throws a clear error outside the provider", () => {
    expect(() => renderHook(() => useGetList("posts"))).toThrow(
      /CheloneProvider/,
    );
  });
});

const undoableListParams = {
  pagination: { page: 1, perPage: 100 },
  sort: { field: "id", order: "ASC" as const },
  filter: {},
};

function makeUndoableWrapper() {
  const dataProvider = fakeDataProvider<R>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData<GetListResult>(
    listKey("posts", undoableListParams),
    {
      data: [
        { id: 1, title: "a" },
        { id: 2, title: "b" },
      ],
      total: 2,
    },
  );
  const notifications = createNotificationStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, queryClient, dataProvider, notifications };
}

function captureUndoable(
  notify: MockInstance<NotificationStore["notify"]>,
): NotifyOptions {
  const call = notify.mock.calls.find((args) => args[1]?.undoable);
  if (!call?.[1]) throw new Error("no undoable notification was enqueued");
  return call[1];
}

function cachedTitles(queryClient: QueryClient): Record<number, string> {
  const list = queryClient.getQueryData<
    GetListResult<z.infer<typeof resources.posts.schema>>
  >(listKey("posts", undoableListParams));
  return Object.fromEntries((list?.data ?? []).map((r) => [r.id, r.title]));
}

describe("undoable useDelete / useUpdate hooks", () => {
  it("useDelete undoable removes the row now, commits the provider exactly once", async () => {
    const { wrapper, queryClient, dataProvider, notifications } =
      makeUndoableWrapper();
    const del = vi.spyOn(dataProvider, "delete");
    const notify = vi.spyOn(notifications, "notify");
    const { result } = renderHook(
      () => useDelete<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    act(() => {
      result.current.mutate({ id: 1 });
    });
    // Optimistic removal; server deferred.
    expect(cachedTitles(queryClient)).toEqual({ 2: "b" });
    expect(del).not.toHaveBeenCalled();
    await act(async () => {
      captureUndoable(notify).onClose?.();
    });
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith("posts", { id: 1 });
  });

  it("useDelete undoable Undo restores the row and never calls the provider", () => {
    const { wrapper, queryClient, dataProvider, notifications } =
      makeUndoableWrapper();
    const del = vi.spyOn(dataProvider, "delete");
    const notify = vi.spyOn(notifications, "notify");
    const { result } = renderHook(
      () => useDelete<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    act(() => {
      result.current.mutate({ id: 1 });
    });
    act(() => {
      captureUndoable(notify).undo?.();
    });
    expect(cachedTitles(queryClient)).toEqual({ 1: "a", 2: "b" });
    expect(del).not.toHaveBeenCalled();
  });

  it("useUpdate undoable patches the cache now and commits once", async () => {
    const { wrapper, queryClient, dataProvider, notifications } =
      makeUndoableWrapper();
    const update = vi.spyOn(dataProvider, "update");
    const notify = vi.spyOn(notifications, "notify");
    const { result } = renderHook(
      () => useUpdate<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    act(() => {
      result.current.mutate({ id: 1, data: { title: "A!" } });
    });
    expect(cachedTitles(queryClient)).toEqual({ 1: "A!", 2: "b" });
    expect(update).not.toHaveBeenCalled();
    await act(async () => {
      captureUndoable(notify).onClose?.();
    });
    expect(update).toHaveBeenCalledTimes(1);
  });
  it("an undoable update calls onSuccess at once with the patched record", () => {
    const { wrapper, dataProvider } = makeUndoableWrapper();
    const update = vi.spyOn(dataProvider, "update");
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useUpdate<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    const params = {
      id: 1,
      data: { title: "A!" },
      previousData: { id: 1, title: "a" },
    };
    act(() => {
      result.current.mutate(params, { onSuccess });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, title: "A!" }, params);
    expect(update).not.toHaveBeenCalled();
  });

  it("an undoable update calls onError and onSettled when the commit fails", async () => {
    const { wrapper, queryClient, dataProvider, notifications } =
      makeUndoableWrapper();
    const failure = new Error("boom");
    vi.spyOn(dataProvider, "update").mockRejectedValue(failure);
    const notify = vi.spyOn(notifications, "notify");
    const onError = vi.fn(() => {
      // Runs after the default rollback and error notification.
      expect(cachedTitles(queryClient)).toEqual({ 1: "a", 2: "b" });
      expect(notify).toHaveBeenCalledWith(
        "chelone.notification.http_error",
        expect.anything(),
      );
    });
    const onSettled = vi.fn();
    const { result } = renderHook(
      () => useUpdate<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    const params = { id: 1, data: { title: "A!" } };
    act(() => {
      result.current.mutate(params, { onError, onSettled });
    });
    expect(onSettled).not.toHaveBeenCalled();
    await act(async () => {
      captureUndoable(notify).onClose?.();
    });
    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure, params);
    expect(onSettled).toHaveBeenCalledWith(params);
  });

  it("an undone update calls no callback after onSuccess", async () => {
    const { wrapper, notifications } = makeUndoableWrapper();
    const notify = vi.spyOn(notifications, "notify");
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(
      () => useUpdate<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    act(() => {
      result.current.mutate(
        { id: 1, data: { title: "A!" } },
        { onSuccess, onError, onSettled },
      );
    });
    await act(async () => {
      const options = captureUndoable(notify);
      options.undo?.();
      options.onClose?.();
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("an onSettled that throws after a committed update neither rolls back nor calls onError", async () => {
    const { wrapper, queryClient, dataProvider, notifications } =
      makeUndoableWrapper();
    const update = vi.spyOn(dataProvider, "update");
    const notify = vi.spyOn(notifications, "notify");
    const onError = vi.fn();
    const onSettled = vi.fn(() => {
      throw new Error("callback bug");
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(
      () => useUpdate<R, "posts">("posts", { mutationMode: "undoable" }),
      { wrapper },
    );
    act(() => {
      result.current.mutate(
        { id: 1, data: { title: "A!" } },
        { onError, onSettled },
      );
    });
    await act(async () => {
      captureUndoable(notify).onClose?.();
    });
    await waitFor(() => expect(onSettled).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(logged).toHaveBeenCalledWith(new Error("callback bug"));
    logged.mockRestore();
    expect(update).toHaveBeenCalledTimes(1);
    expect(cachedTitles(queryClient)).toEqual({ 1: "A!", 2: "b" });
    expect(notify).not.toHaveBeenCalledWith(
      "chelone.notification.http_error",
      expect.anything(),
    );
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});

type BulkMode = "pessimistic" | "undoable";

/** Lists the posts and runs one bulk delete or update of both rows on click. */
function bulkProbe(kind: "delete" | "update", mutationMode: BulkMode) {
  return function BulkProbe() {
    const list = useGetList<R, "posts">("posts");
    const del = useDeleteMany<R, "posts">("posts", { mutationMode });
    const update = useUpdateMany<R, "posts">("posts", { mutationMode });
    return (
      <div>
        <ul>
          {list.data?.data.map((post) => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            kind === "delete"
              ? del.mutate({ ids: [1, 2] })
              : update.mutate({ ids: [1, 2], data: { title: "same" } })
          }
        >
          run
        </button>
      </div>
    );
  };
}

function mountBulk(kind: "delete" | "update", mutationMode: BulkMode) {
  const dataProvider = fakeDataProvider<R>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
  });
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  render(
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
        notifications={notifications}
      >
        <Resource name="posts" list={bulkProbe(kind, mutationMode)} />
      </Admin>
    </MemoryRouter>,
  );
  const titles = () =>
    screen.queryAllByRole("listitem").map((item) => item.textContent);
  return { dataProvider, notify, titles };
}

describe("useDeleteMany / useUpdateMany hooks", () => {
  it("useDeleteMany deletes the ids and refetches the list", async () => {
    const { dataProvider, titles } = mountBulk("delete", "pessimistic");
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    fireEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(titles()).toEqual([]));
    expect(deleteMany).toHaveBeenCalledWith("posts", { ids: [1, 2] });
  });

  it("useUpdateMany updates the ids and refetches the list", async () => {
    const { dataProvider, titles } = mountBulk("update", "pessimistic");
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    fireEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(titles()).toEqual(["same", "same"]));
    expect(updateMany).toHaveBeenCalledWith("posts", {
      ids: [1, 2],
      data: { title: "same" },
    });
  });

  it("undoable useDeleteMany removes the rows now and calls deleteMany only after the undo window", async () => {
    const { dataProvider, notify, titles } = mountBulk("delete", "undoable");
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    fireEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(titles()).toEqual([]));
    expect(deleteMany).not.toHaveBeenCalled();
    await act(async () => {
      captureUndoable(notify).onClose?.();
    });
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith("posts", { ids: [1, 2] });
  });

  it("undo restores the rows and never calls deleteMany", async () => {
    const { dataProvider, notify, titles } = mountBulk("delete", "undoable");
    const deleteMany = vi.spyOn(dataProvider, "deleteMany");
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    fireEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(titles()).toEqual([]));
    act(() => {
      captureUndoable(notify).undo?.();
    });
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("undoable useUpdateMany patches the rows now and calls updateMany only after the undo window", async () => {
    const { dataProvider, notify, titles } = mountBulk("update", "undoable");
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    fireEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(titles()).toEqual(["same", "same"]));
    expect(updateMany).not.toHaveBeenCalled();
    await act(async () => {
      captureUndoable(notify).onClose?.();
    });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith("posts", {
      ids: [1, 2],
      data: { title: "same" },
    });
  });

  it("undo restores the rows and never calls updateMany", async () => {
    const { dataProvider, notify, titles } = mountBulk("update", "undoable");
    const updateMany = vi.spyOn(dataProvider, "updateMany");
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    fireEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(titles()).toEqual(["same", "same"]));
    act(() => {
      captureUndoable(notify).undo?.();
    });
    await waitFor(() => expect(titles()).toEqual(["a", "b"]));
    expect(updateMany).not.toHaveBeenCalled();
  });
});
