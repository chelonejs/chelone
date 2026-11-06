import {
  type DataProvider,
  fakeDataProvider,
  memoryTransport,
  type RealtimeConnectionStatus,
  type RealtimeEvent,
  type RealtimeTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "./context";
import {
  useOnReconnect,
  usePublish,
  useRealtimeStatus,
  useSubscribe,
  useSubscribeCallback,
  useSubscribeToRecord,
  useSubscribeToRecordList,
} from "./realtime-hooks";

const event = (type = "updated"): Omit<RealtimeEvent, "topic"> => ({
  type,
  payload: {},
});

function setup(transportOverride?: RealtimeTransport) {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(
    fakeDataProvider({}),
    transportOverride ?? transport,
  );
  const subscribe = vi.spyOn(dataProvider, "subscribe");
  const wrapperFor =
    (provider: DataProvider) =>
    ({ children }: { children: ReactNode }) => (
      <CheloneProvider dataProvider={provider} queryClient={new QueryClient()}>
        {children}
      </CheloneProvider>
    );
  return {
    transport,
    dataProvider,
    subscribe,
    wrapper: wrapperFor(dataProvider),
    wrapperFor,
  };
}

const plainProvider = () => fakeDataProvider({});

describe("useSubscribe", () => {
  it("calls the callback when an event arrives on the topic", async () => {
    const { wrapper, dataProvider } = setup();
    const callback = vi.fn();
    renderHook(() => useSubscribe("resource/posts", callback), { wrapper });

    await act(() => dataProvider.publish("resource/posts", event("created")));
    await act(() => dataProvider.publish("resource/other", event()));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({
      topic: "resource/posts",
      type: "created",
      payload: {},
    });
  });

  it("does not subscribe when enabled is false", async () => {
    const { wrapper, dataProvider, subscribe } = setup();
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useSubscribe("t", callback, { enabled }),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(subscribe).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(subscribe).toHaveBeenCalledTimes(1);
    await act(() => dataProvider.publish("t", event()));
    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    await act(() => dataProvider.publish("t", event()));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls the latest callback without resubscribing", async () => {
    const { wrapper, dataProvider, subscribe } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useSubscribe("t", cb), {
      wrapper,
      initialProps: { cb: first },
    });
    rerender({ cb: second });

    await act(() => dataProvider.publish("t", event()));

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("resubscribes when the topic changes and unsubscribes on unmount", async () => {
    const { wrapper, dataProvider } = setup();
    const callback = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ topic }) => useSubscribe(topic, callback),
      { wrapper, initialProps: { topic: "a" } },
    );
    rerender({ topic: "b" });

    await act(() => dataProvider.publish("a", event()));
    expect(callback).not.toHaveBeenCalled();
    await act(() => dataProvider.publish("b", event()));
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
    await dataProvider.publish("b", event());
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("throws a clear error when the data provider is not realtime", () => {
    const { wrapperFor } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderHook(() => useSubscribe("t", vi.fn()), {
        wrapper: wrapperFor(plainProvider()),
      }),
    ).toThrow(/useSubscribe: dataProvider does not implement subscribe\(\)/);
  });

  it("stays silent on a plain provider while disabled", () => {
    const { wrapperFor } = setup();
    expect(() =>
      renderHook(() => useSubscribe("t", vi.fn(), { enabled: false }), {
        wrapper: wrapperFor(plainProvider()),
      }),
    ).not.toThrow();
  });
});

describe("useSubscribeCallback", () => {
  it("returns a stable function that returns the unsubscribe", async () => {
    const { wrapper, dataProvider } = setup();
    const callback = vi.fn();
    const { result, rerender } = renderHook(() => useSubscribeCallback(), {
      wrapper,
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    const unsubscribe = result.current("t", callback);
    await act(() => dataProvider.publish("t", event()));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    await act(() => dataProvider.publish("t", event()));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("useSubscribeToRecord", () => {
  it("subscribes to the record topic", async () => {
    const { wrapper, dataProvider } = setup();
    const callback = vi.fn();
    renderHook(() => useSubscribeToRecord("posts", 7, callback), { wrapper });

    await act(() => dataProvider.publish("resource/posts/8", event()));
    await act(() => dataProvider.publish("resource/posts/7", event()));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does nothing while the id is undefined and subscribes for id 0", () => {
    const { wrapper, subscribe } = setup();
    const initialProps: { id: number | null | undefined } = { id: undefined };
    const { rerender } = renderHook(
      ({ id }: { id: number | null | undefined }) =>
        useSubscribeToRecord("posts", id, vi.fn()),
      { wrapper, initialProps },
    );
    rerender({ id: null });
    expect(subscribe).not.toHaveBeenCalled();

    rerender({ id: 0 });
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe.mock.calls[0]?.[0]).toBe("resource/posts/0");
  });
});

describe("useSubscribeToRecordList", () => {
  it("subscribes to the resource topic", async () => {
    const { wrapper, dataProvider } = setup();
    const callback = vi.fn();
    renderHook(() => useSubscribeToRecordList("posts", callback), { wrapper });

    await act(() => dataProvider.publish("resource/posts", event("created")));
    await act(() => dataProvider.publish("resource/comments", event()));

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("usePublish", () => {
  it("publishes through the data provider with a stable function", async () => {
    const { wrapper, transport } = setup();
    const { result, rerender } = renderHook(() => usePublish(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    await result.current("chat", event("message"));

    expect(transport.publishedEvents).toEqual([
      { topic: "chat", type: "message", payload: {} },
    ]);
  });

  it("throws a clear error when the data provider is not realtime", () => {
    const { wrapperFor } = setup();
    const { result } = renderHook(() => usePublish(), {
      wrapper: wrapperFor(plainProvider()),
    });
    expect(() => result.current("chat", event())).toThrow(
      /usePublish: dataProvider does not implement subscribe\(\)/,
    );
  });
});

describe("useOnReconnect", () => {
  it("fires the latest callback after simulateReconnect", () => {
    const { wrapper, transport } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ cb }) => useOnReconnect(cb), {
      wrapper,
      initialProps: { cb: first },
    });
    rerender({ cb: second });

    act(() => transport.simulateReconnect());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    transport.simulateReconnect();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does nothing on a transport without onReconnect", () => {
    const bare: RealtimeTransport = {
      subscribe: () => () => {},
      publish: async () => {},
    };
    const { wrapper } = setup(bare);
    expect(() =>
      renderHook(() => useOnReconnect(vi.fn()), { wrapper }),
    ).not.toThrow();
  });
});

describe("useRealtimeStatus", () => {
  it("is idle when the transport has no status support", () => {
    const bare: RealtimeTransport = {
      subscribe: () => () => {},
      publish: async () => {},
    };
    const { wrapper } = setup(bare);
    const { result } = renderHook(() => useRealtimeStatus(), { wrapper });
    expect(result.current).toEqual({ status: "idle", lastError: null });
  });

  it("starts from the transport's current status and follows changes", () => {
    const { wrapper, transport } = setup();
    transport.setStatus("reconnecting");
    const { result } = renderHook(() => useRealtimeStatus(), { wrapper });
    expect(result.current.status).toBe(
      "reconnecting" satisfies RealtimeConnectionStatus,
    );

    act(() => transport.setStatus("connected"));
    expect(result.current.status).toBe("connected");
  });

  it("reports the last transport error", async () => {
    const transport = memoryTransport();
    const { wrapper, dataProvider } = setup(transport);
    const { result } = renderHook(() => useRealtimeStatus(), { wrapper });
    expect(result.current.lastError).toBeNull();

    const cause = new Error("boom");
    dataProvider.subscribe("t", () => {
      throw cause;
    });
    await act(() => dataProvider.publish("t", event()));

    expect(result.current.lastError).toEqual({
      kind: "handler_threw",
      topic: "t",
      cause,
      retrying: false,
    });
  });
});
