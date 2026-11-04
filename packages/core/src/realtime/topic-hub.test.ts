import { describe, expect, it, vi } from "vitest";
import { createTopicHub } from "./topic-hub";
import type { RealtimeEvent, RealtimeTransportError } from "./types";

const event = (
  topic: string,
  payload: number | null = null,
): RealtimeEvent => ({
  topic,
  type: "created",
  payload,
});

describe("createTopicHub", () => {
  it("dispatches an event to the subscribers of its topic only", () => {
    const hub = createTopicHub();
    const onPosts = vi.fn();
    const onUsers = vi.fn();
    hub.subscribe("resource/posts", onPosts);
    hub.subscribe("resource/users", onUsers);

    hub.dispatch(event("resource/posts", 1));

    expect(onPosts).toHaveBeenCalledExactlyOnceWith(event("resource/posts", 1));
    expect(onUsers).not.toHaveBeenCalled();
  });

  it("a callback subscribed twice and unsubscribed once still runs", () => {
    const hub = createTopicHub();
    const callback = vi.fn();
    const first = hub.subscribe("t", callback);
    hub.subscribe("t", callback);

    first();
    hub.dispatch(event("t"));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("a throwing subscriber is reported as handler_threw and the others still run", () => {
    const onError = vi.fn();
    const hub = createTopicHub({ onError });
    const cause = new Error("boom");
    const after = vi.fn();
    hub.subscribe("t", () => {
      throw cause;
    });
    hub.subscribe("t", after);

    hub.dispatch(event("t"));

    expect(after).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      kind: "handler_threw",
      topic: "t",
      cause,
      retrying: false,
    });
  });

  it("a callback that unsubscribes during dispatch does not skip the next subscriber", () => {
    const hub = createTopicHub();
    const calls: string[] = [];
    const unsubscribeFirst = hub.subscribe("t", () => {
      calls.push("first");
      unsubscribeFirst();
    });
    hub.subscribe("t", () => calls.push("second"));

    hub.dispatch(event("t"));
    hub.dispatch(event("t"));

    expect(calls).toEqual(["first", "second", "second"]);
  });

  it("a callback unsubscribed by an earlier one in the same dispatch is skipped", () => {
    const hub = createTopicHub();
    const second = vi.fn();
    hub.subscribe("t", () => unsubscribeSecond());
    const unsubscribeSecond = hub.subscribe("t", second);

    hub.dispatch(event("t"));

    expect(second).not.toHaveBeenCalled();
  });

  it("a throwing error listener does not stop the other listeners", () => {
    const onError = vi.fn();
    const hub = createTopicHub({ onError });
    const listener = vi.fn();
    hub.onError(() => {
      throw new Error("listener");
    });
    hub.onError(listener);
    const error: RealtimeTransportError = {
      kind: "send_failed",
      retrying: false,
    };

    expect(() => hub.report(error)).not.toThrow();

    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(listener).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("a stopped error listener is no longer called", () => {
    const hub = createTopicHub();
    const listener = vi.fn();
    hub.onError(listener)();

    hub.report({ kind: "send_failed", retrying: false });

    expect(listener).not.toHaveBeenCalled();
  });

  it("has and topics follow the first subscribe and the last unsubscribe", () => {
    const hub = createTopicHub();
    expect(hub.has("a")).toBe(false);
    expect(hub.topics()).toEqual([]);

    const first = hub.subscribe("a", () => {});
    const second = hub.subscribe("a", () => {});
    hub.subscribe("b", () => {});
    expect(hub.has("a")).toBe(true);
    expect(hub.topics()).toEqual(["a", "b"]);

    first();
    expect(hub.has("a")).toBe(true);
    second();
    expect(hub.has("a")).toBe(false);
    expect(hub.topics()).toEqual(["b"]);
  });

  it("setStatus notifies status listeners and reconnected calls each reconnect listener", () => {
    const hub = createTopicHub();
    const onStatus = vi.fn();
    const after = vi.fn();
    hub.onStatusChange(onStatus);
    hub.onReconnect(() => {
      throw new Error("listener");
    });
    hub.onReconnect(after);

    expect(hub.getStatus()).toBe("connected");
    hub.setStatus("reconnecting");
    hub.reconnected();

    expect(hub.getStatus()).toBe("reconnecting");
    expect(onStatus).toHaveBeenCalledExactlyOnceWith("reconnecting");
    expect(after).toHaveBeenCalledTimes(1);
  });
});
