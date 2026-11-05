import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimeConnectionStatus, RealtimeTransportError } from "./types";
import {
  type WebSocketTransport,
  webSocketTransport,
} from "./websocket-transport";

class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = [];
  readonly sent: string[] = [];
  closeCalls = 0;

  constructor(
    readonly url: string,
    readonly protocols?: string | string[],
  ) {
    super();
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closeCalls += 1;
  }

  frames() {
    return this.sent.map((data) => JSON.parse(data));
  }

  open() {
    this.dispatchEvent(new Event("open"));
  }

  receive(frame: string | object) {
    const data = typeof frame === "string" ? frame : JSON.stringify(frame);
    this.dispatchEvent(new MessageEvent("message", { data }));
  }

  /** An unclean close by default, like a lost network. */
  drop(code = 1006, wasClean = false) {
    this.dispatchEvent(
      Object.assign(new Event("close"), { code, reason: "", wasClean }),
    );
  }
}

const socketAt = (index: number): FakeWebSocket => {
  const socket = FakeWebSocket.instances[index];
  if (!socket) throw new Error(`no socket at ${index}`);
  return socket;
};

const transports: WebSocketTransport[] = [];
const make = (
  options: Partial<Parameters<typeof webSocketTransport>[0]> = {},
) => {
  const transport = webSocketTransport({
    url: "ws://localhost/realtime",
    ...options,
    reconnect: { jitter: 0, ...options.reconnect },
  });
  transports.push(transport);
  return transport;
};

const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  for (const transport of transports.splice(0)) transport.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("webSocketTransport", () => {
  it("sends a subscribe frame on subscribe()", () => {
    const transport = make();
    transport.subscribe("resource/posts", vi.fn());

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socketAt(0).sent).toEqual([]);
    socketAt(0).open();

    expect(socketAt(0).frames()).toEqual([
      { op: "subscribe", topic: "resource/posts" },
    ]);
  });

  it("dispatches incoming events to subscribers", () => {
    const transport = make();
    const posts = vi.fn();
    const users = vi.fn();
    transport.subscribe("resource/posts", posts);
    transport.subscribe("resource/users", users);
    socketAt(0).open();

    socketAt(0).receive({
      topic: "resource/posts",
      type: "created",
      payload: { ids: [1] },
      meta: { by: "ann" },
    });

    expect(posts).toHaveBeenCalledExactlyOnceWith({
      topic: "resource/posts",
      type: "created",
      payload: { ids: [1] },
      meta: { by: "ann" },
    });
    expect(users).not.toHaveBeenCalled();
  });

  it("a subscriber that unsubscribes mid-dispatch skips no neighbour", () => {
    const transport = make();
    const calls: string[] = [];
    const stopFirst = transport.subscribe("t", () => {
      calls.push("first");
      stopFirst();
    });
    transport.subscribe("t", () => calls.push("second"));
    socketAt(0).open();

    socketAt(0).receive({ topic: "t", type: "updated", payload: null });

    expect(calls).toEqual(["first", "second"]);
  });

  it("publishes a publish frame", async () => {
    const transport = make();
    transport.subscribe("resource/posts", vi.fn());
    socketAt(0).open();

    await transport.publish("resource/posts", {
      type: "updated",
      payload: { id: 1 },
    });

    expect(socketAt(0).frames()).toContainEqual({
      op: "publish",
      topic: "resource/posts",
      event: { type: "updated", payload: { id: 1 } },
    });
  });

  it("queues a publish until the socket opens", async () => {
    const transport = make();
    const settled = vi.fn();
    const result = transport
      .publish("resource/posts", { type: "created", payload: 1 })
      .then(settled);

    expect(FakeWebSocket.instances).toHaveLength(1);
    await settle();
    expect(settled).not.toHaveBeenCalled();
    expect(socketAt(0).sent).toEqual([]);

    socketAt(0).open();
    await result;

    expect(socketAt(0).frames()).toEqual([
      {
        op: "publish",
        topic: "resource/posts",
        event: { type: "created", payload: 1 },
      },
    ]);
  });

  it("sends an unsubscribe frame when a topic's last subscriber leaves", () => {
    const transport = make();
    const stopA = transport.subscribe("t", vi.fn());
    const stopB = transport.subscribe("t", vi.fn());
    socketAt(0).open();

    stopA();
    expect(socketAt(0).frames()).toEqual([{ op: "subscribe", topic: "t" }]);
    stopB();
    stopB();

    expect(socketAt(0).frames()).toEqual([
      { op: "subscribe", topic: "t" },
      { op: "unsubscribe", topic: "t" },
    ]);
  });

  it("retries an unclean close with backoff and resubscribes every topic", async () => {
    const errors: RealtimeTransportError[] = [];
    const transport = make({
      reconnect: { initialDelayMs: 1000 },
      onError: (error) => errors.push(error),
    });
    transport.subscribe("a", vi.fn());
    transport.subscribe("b", vi.fn());
    socketAt(0).open();

    socketAt(0).drop();
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    socketAt(1).drop();
    await vi.advanceTimersByTimeAsync(1999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeWebSocket.instances).toHaveLength(3);

    socketAt(2).open();
    expect(socketAt(2).frames()).toEqual([
      { op: "subscribe", topic: "a" },
      { op: "subscribe", topic: "b" },
    ]);
    expect(errors.map((error) => error.retrying)).toEqual([true, true]);

    socketAt(2).drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it("calls onReconnect after a reopen that follows a drop, not after the first open", async () => {
    const transport = make({ reconnect: { initialDelayMs: 1000 } });
    const onReconnect = vi.fn();
    transport.onReconnect(onReconnect);
    transport.subscribe("t", vi.fn());

    socketAt(0).drop();
    await vi.advanceTimersByTimeAsync(1000);
    socketAt(1).open();
    expect(onReconnect).not.toHaveBeenCalled();

    socketAt(1).drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onReconnect).not.toHaveBeenCalled();
    socketAt(2).open();

    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("stops after maxAttempts, reports connect_failed and rejects queued publishes", async () => {
    const errors: RealtimeTransportError[] = [];
    const transport = make({
      reconnect: { initialDelayMs: 1000, maxAttempts: 1 },
      onError: (error) => errors.push(error),
    });
    const queued = expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).rejects.toBeInstanceOf(Error);

    socketAt(0).drop();
    await vi.advanceTimersByTimeAsync(1000);
    socketAt(1).drop();
    await queued;

    expect(errors.map(({ kind, retrying }) => ({ kind, retrying }))).toEqual([
      { kind: "connect_failed", retrying: true },
      { kind: "connect_failed", retrying: false },
    ]);
    expect(transport.getStatus()).toBe("disconnected");
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("a clean close from the server does not retry", async () => {
    const errors: RealtimeTransportError[] = [];
    const transport = make({ onError: (error) => errors.push(error) });
    transport.subscribe("t", vi.fn());
    socketAt(0).open();

    socketAt(0).drop(1000, true);
    await vi.advanceTimersByTimeAsync(120000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(transport.getStatus()).toBe("disconnected");
    expect(errors).toEqual([]);
  });

  it("status moves through idle, connected, reconnecting and disconnected", async () => {
    const transport = make({
      reconnect: { initialDelayMs: 1000, maxAttempts: 1 },
    });
    const seen: RealtimeConnectionStatus[] = [];
    transport.onStatusChange((status) => seen.push(status));
    expect(transport.getStatus()).toBe("idle");

    transport.subscribe("t", vi.fn());
    expect(transport.getStatus()).toBe("idle");
    socketAt(0).open();
    expect(transport.getStatus()).toBe("connected");

    socketAt(0).drop();
    expect(transport.getStatus()).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(1000);
    expect(transport.getStatus()).toBe("reconnecting");
    socketAt(1).drop();

    expect(transport.getStatus()).toBe("disconnected");
    expect(seen).toEqual(["connected", "reconnecting", "disconnected"]);
  });

  it("a missed pong closes the socket and retries", async () => {
    const transport = make({
      heartbeatMs: 1000,
      reconnect: { initialDelayMs: 500 },
    });
    transport.subscribe("t", vi.fn());
    socketAt(0).open();

    await vi.advanceTimersByTimeAsync(1000);
    expect(socketAt(0).frames()).toContainEqual({ op: "ping" });
    socketAt(0).receive({ op: "pong" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(socketAt(0).closeCalls).toBe(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(socketAt(0).closeCalls).toBe(1);
    expect(transport.getStatus()).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(500);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // The late close event of the dead socket must not schedule a second retry.
    socketAt(0).drop(1000, true);
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("the idle close reports no error and returns to idle", async () => {
    const errors: RealtimeTransportError[] = [];
    const transport = make({
      idleDisconnectMs: 5000,
      onError: (error) => errors.push(error),
    });
    const onReconnect = vi.fn();
    transport.onReconnect(onReconnect);
    const stop = transport.subscribe("t", vi.fn());
    socketAt(0).open();
    stop();

    await vi.advanceTimersByTimeAsync(4999);
    expect(socketAt(0).closeCalls).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(socketAt(0).closeCalls).toBe(1);
    // A real socket fires its close event after close().
    socketAt(0).drop(1000, true);
    await vi.advanceTimersByTimeAsync(120000);

    expect(transport.getStatus()).toBe("idle");
    expect(errors).toEqual([]);
    expect(FakeWebSocket.instances).toHaveLength(1);

    transport.subscribe("t", vi.fn());
    expect(FakeWebSocket.instances).toHaveLength(2);
    socketAt(1).open();
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("close while the token is pending opens no socket", async () => {
    let resolveToken: (token: string) => void = () => {};
    const transport = make({
      getAuthToken: () =>
        new Promise<string>((resolve) => {
          resolveToken = resolve;
        }),
    });
    const queued = expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).rejects.toBeInstanceOf(Error);

    transport.close();
    resolveToken("secret");
    await settle();
    await queued;

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(transport.getStatus()).toBe("disconnected");
  });

  it("a later subscribe or publish opens again after close()", async () => {
    const transport = make();
    transport.subscribe("t", vi.fn());
    socketAt(0).open();

    transport.close();
    expect(socketAt(0).closeCalls).toBe(1);
    expect(transport.getStatus()).toBe("disconnected");

    const sent = transport.publish("t", { type: "created", payload: 1 });
    expect(FakeWebSocket.instances).toHaveLength(2);
    socketAt(1).open();
    await sent;

    expect(socketAt(1).frames()).toEqual([
      { op: "subscribe", topic: "t" },
      { op: "publish", topic: "t", event: { type: "created", payload: 1 } },
    ]);
  });

  it("a rejected token reports auth_failed and rejects queued publishes", async () => {
    const errors: RealtimeTransportError[] = [];
    const cause = new Error("no session");
    const transport = make({
      getAuthToken: () => Promise.reject(cause),
      onError: (error) => errors.push(error),
    });
    const queued = expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).rejects.toBe(cause);

    await settle();
    await queued;

    expect(errors).toEqual([{ kind: "auth_failed", cause, retrying: false }]);
    expect(transport.getStatus()).toBe("disconnected");
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("an unparseable frame is reported as parse_failed", () => {
    const errors: RealtimeTransportError[] = [];
    const transport = make({ onError: (error) => errors.push(error) });
    const callback = vi.fn();
    transport.subscribe("t", callback);
    socketAt(0).open();

    socketAt(0).receive("not json");
    socketAt(0).receive({ nothing: true });

    expect(errors.map((error) => error.kind)).toEqual([
      "parse_failed",
      "parse_failed",
    ]);
    expect(callback).not.toHaveBeenCalled();
  });

  it("a throwing subscriber is reported as handler_threw and the others still run", () => {
    const errors: RealtimeTransportError[] = [];
    const transport = make({ onError: (error) => errors.push(error) });
    const after = vi.fn();
    transport.subscribe("t", () => {
      throw new Error("boom");
    });
    transport.subscribe("t", after);
    socketAt(0).open();

    socketAt(0).receive({ topic: "t", type: "updated", payload: 1 });

    expect(after).toHaveBeenCalledTimes(1);
    expect(errors).toMatchObject([{ kind: "handler_threw", topic: "t" }]);
  });

  it("a hostile token cannot add query parameters and never reaches a reported error", async () => {
    const token = "a&topics=x#frag";
    const errors: RealtimeTransportError[] = [];
    const onError = (error: RealtimeTransportError) => errors.push(error);

    const query = make({ getAuthToken: () => token, onError });
    query.subscribe("t", vi.fn());
    await settle();
    const queryUrl = socketAt(0).url;
    expect(queryUrl).toContain("token=a%26topics%3Dx%23frag");
    expect([...new URL(queryUrl).searchParams.keys()]).toEqual(["token"]);
    socketAt(0).open();
    socketAt(0).receive("not json");
    socketAt(0).drop();

    const subprotocol = make({
      getAuthToken: () => token,
      authMode: "subprotocol",
      protocols: ["chelone"],
      onError,
    });
    subprotocol.subscribe("t", vi.fn());
    await settle();
    expect(socketAt(1).url).toBe("ws://localhost/realtime");
    expect(socketAt(1).protocols).toEqual(["chelone", token]);
    socketAt(1).drop();

    expect(errors.length).toBeGreaterThan(0);
    const reported = JSON.stringify(errors);
    expect(reported).not.toContain(token);
    expect(reported).not.toContain(encodeURIComponent(token));
  });
});
