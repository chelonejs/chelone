import { describe, expect, it, vi } from "vitest";
import { memoryTransport } from "./memory-transport";
import type { RealtimeEvent } from "./types";

describe("memoryTransport", () => {
  it("delivers an event to subscribers of its topic only", async () => {
    const transport = memoryTransport();
    const onPosts = vi.fn();
    const onUsers = vi.fn();
    transport.subscribe("resource/posts", onPosts);
    transport.subscribe("resource/users", onUsers);

    await transport.publish("resource/posts", {
      type: "created",
      payload: { ids: [1] },
    });

    expect(onPosts).toHaveBeenCalledExactlyOnceWith({
      topic: "resource/posts",
      type: "created",
      payload: { ids: [1] },
    });
    expect(onUsers).not.toHaveBeenCalled();
  });

  it("unsubscribe stops further delivery", async () => {
    const transport = memoryTransport();
    const callback = vi.fn();
    const unsubscribe = transport.subscribe("t", callback);

    await transport.publish("t", { type: "created", payload: 1 });
    unsubscribe();
    await transport.publish("t", { type: "created", payload: 2 });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("several subscribers on one topic all receive the event", async () => {
    const transport = memoryTransport();
    const first = vi.fn();
    const second = vi.fn();
    transport.subscribe("t", first);
    transport.subscribe("t", second);

    await transport.publish("t", { type: "updated", payload: null });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("records published events", async () => {
    const transport = memoryTransport();

    await transport.publish("a", { type: "created", payload: 1 });
    await transport.publish("b", { type: "deleted", payload: 2 });

    expect(transport.publishedEvents).toEqual<RealtimeEvent[]>([
      { topic: "a", type: "created", payload: 1 },
      { topic: "b", type: "deleted", payload: 2 },
    ]);
  });

  it("a throwing subscriber is isolated and reported as handler_threw", async () => {
    const onError = vi.fn();
    const transport = memoryTransport({ onError });
    const listener = vi.fn();
    transport.onError?.(listener);
    const boom = new Error("boom");
    const after = vi.fn();
    transport.subscribe("t", () => {
      throw boom;
    });
    transport.subscribe("t", after);

    await expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).resolves.toBeUndefined();

    expect(after).toHaveBeenCalledTimes(1);
    const expected = {
      kind: "handler_threw",
      topic: "t",
      cause: boom,
      retrying: false,
    };
    expect(onError).toHaveBeenCalledExactlyOnceWith(expected);
    expect(listener).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("a throwing error handler does not stop later subscribers or error listeners", async () => {
    const transport = memoryTransport({
      onError: () => {
        throw new Error("option handler");
      },
    });
    const first = vi.fn(() => {
      throw new Error("first");
    });
    const later = vi.fn();
    const throwingListener = vi.fn(() => {
      throw new Error("listener");
    });
    const laterListener = vi.fn();
    transport.onError(throwingListener);
    transport.onError(laterListener);
    transport.subscribe("t", first);
    transport.subscribe("t", later);
    transport.subscribe("t", first);

    await expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).resolves.toBeUndefined();

    expect(later).toHaveBeenCalledTimes(1);
    expect(laterListener).toHaveBeenCalledTimes(2);
  });

  it("a callback that unsubscribes during dispatch does not skip the next subscriber", async () => {
    const transport = memoryTransport();
    const calls: string[] = [];
    const unsubscribeFirst = transport.subscribe("t", () => {
      calls.push("first");
      unsubscribeFirst();
    });
    transport.subscribe("t", () => calls.push("second"));
    transport.subscribe("t", () => calls.push("third"));

    await transport.publish("t", { type: "created", payload: 1 });
    await transport.publish("t", { type: "created", payload: 2 });

    expect(calls).toEqual(["first", "second", "third", "second", "third"]);
  });

  it("delayMs delays dispatch and honours an unsubscribe during the delay", async () => {
    vi.useFakeTimers();
    try {
      const transport = memoryTransport({ delayMs: 50 });
      const kept = vi.fn();
      const dropped = vi.fn();
      transport.subscribe("t", kept);
      const unsubscribe = transport.subscribe("t", dropped);

      const done = transport.publish("t", { type: "created", payload: 1 });
      expect(transport.publishedEvents).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(49);
      expect(kept).not.toHaveBeenCalled();
      unsubscribe();
      await vi.advanceTimersByTimeAsync(1);
      await done;

      expect(kept).toHaveBeenCalledTimes(1);
      expect(dropped).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("simulateReconnect calls every onReconnect listener until it is removed", () => {
    const transport = memoryTransport();
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = transport.onReconnect?.(first);
    transport.onReconnect?.(second);

    transport.simulateReconnect();
    removeFirst?.();
    transport.simulateReconnect();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it("setStatus updates getStatus and notifies onStatusChange listeners", () => {
    const transport = memoryTransport();
    const listener = vi.fn();
    const remove = transport.onStatusChange?.(listener);
    expect(transport.getStatus?.()).toBe("connected");

    transport.setStatus("reconnecting");

    expect(transport.getStatus?.()).toBe("reconnecting");
    expect(listener).toHaveBeenCalledExactlyOnceWith("reconnecting");

    remove?.();
    transport.setStatus("disconnected");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
