import {
  addEventsForMutations,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import { useGetListLive, useGetManyLive, useGetOneLive } from "./live-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type R = typeof resources;

function setup() {
  const transport = memoryTransport();
  const base = fakeDataProvider<R>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
      { id: 3, title: "c" },
    ],
  });
  const dataProvider = realtimeDataProvider(
    addEventsForMutations(base, transport),
    transport,
  );
  const getList = vi.spyOn(dataProvider, "getList");
  const getOne = vi.spyOn(dataProvider, "getOne");
  const getMany = vi.spyOn(dataProvider, "getMany");
  const subscribe = vi.spyOn(dataProvider, "subscribe");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider dataProvider={dataProvider} queryClient={queryClient}>
      {children}
    </CheloneProvider>
  );
  const emit = (topic: string) =>
    act(() => dataProvider.publish(topic, { type: "updated", payload: {} }));
  return {
    transport,
    dataProvider,
    wrapper,
    getList,
    getOne,
    getMany,
    subscribe,
    emit,
  };
}

describe("useGetListLive", () => {
  it("returns the list and refetches when a created event arrives", async () => {
    const { wrapper, getList, dataProvider } = setup();
    const { result } = renderHook(() => useGetListLive<R, "posts">("posts"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map((p) => p.title)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(getList).toHaveBeenCalledTimes(1);

    await act(async () => {
      await dataProvider.create("posts", {
        data: { id: 4, title: "d" },
      });
    });

    await waitFor(() => expect(result.current.data?.data).toHaveLength(4));
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it("refetches after a reconnect and stops on unmount", async () => {
    const { wrapper, getList, transport, emit } = setup();
    const { result, unmount } = renderHook(
      () => useGetListLive<R, "posts">("posts"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => transport.simulateReconnect());
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));

    unmount();
    await emit("resource/posts");
    act(() => transport.simulateReconnect());
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it("does not subscribe when enabled is false", async () => {
    const { wrapper, getList, subscribe } = setup();
    renderHook(
      () => useGetListLive<R, "posts">("posts", {}, { enabled: false }),
      { wrapper },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(subscribe).not.toHaveBeenCalled();
    expect(getList).not.toHaveBeenCalled();
  });
});

describe("useGetOneLive", () => {
  it("refetches when its record changes and ignores other records", async () => {
    const { wrapper, getOne, emit } = setup();
    const { result } = renderHook(
      () => useGetOneLive<R, "posts">("posts", { id: 1 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getOne).toHaveBeenCalledTimes(1);

    await emit("resource/posts/2");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(getOne).toHaveBeenCalledTimes(1);

    await emit("resource/posts/1");
    await waitFor(() => expect(getOne).toHaveBeenCalledTimes(2));
  });
});

describe("useGetManyLive", () => {
  it("refetches when any listed record changes", async () => {
    const { wrapper, getMany, emit } = setup();
    const { result } = renderHook(
      () => useGetManyLive<R, "posts">("posts", { ids: [1, 2] }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMany).toHaveBeenCalledTimes(1);

    await emit("resource/posts/2");
    await waitFor(() => expect(getMany).toHaveBeenCalledTimes(2));
  });

  it("does not resubscribe when a new array holds the same ids", async () => {
    const { wrapper, subscribe } = setup();
    const { result, rerender } = renderHook(
      ({ ids }) => useGetManyLive<R, "posts">("posts", { ids }),
      { wrapper, initialProps: { ids: [1, 2] } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(subscribe).toHaveBeenCalledTimes(2);

    rerender({ ids: [2, 1] });
    expect(subscribe).toHaveBeenCalledTimes(2);

    rerender({ ids: [1, 2, 3] });
    expect(subscribe).toHaveBeenCalledTimes(5);
  });

  it("refetches after updateMany through addEventsForMutations", async () => {
    const { wrapper, getMany, dataProvider } = setup();
    const { result } = renderHook(
      () => useGetManyLive<R, "posts">("posts", { ids: [1, 2] }),
      { wrapper },
    );
    // Reading data here makes react-query re-render when it changes.
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    await act(async () => {
      await dataProvider.updateMany("posts", {
        ids: [1],
        data: { title: "z" },
      });
    });

    await waitFor(() => expect(getMany).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.data?.map((p) => p.title)).toContain("z"),
    );
  });
});
