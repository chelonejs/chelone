import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type SseTransport, sseTransport } from "./sse-transport";
import type { RealtimeConnectionStatus, RealtimeTransportError } from "./types";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  readonly withCredentials: boolean;
  closed = false;
  private readonly listeners = new Map<string, Set<(event: Event) => void>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = init?.withCredentials ?? false;
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, listener: (event: Event) => void) {
    const set = this.listeners.get(name) ?? new Set();
    set.add(listener);
    this.listeners.set(name, set);
  }

  removeEventListener(name: string, listener: (event: Event) => void) {
    this.listeners.get(name)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  open() {
    this.fire("open", new Event("open"));
  }

  fail() {
    this.fire("error", new Event("error"));
  }

  message(name: string, data: string) {
    this.fire(name, new MessageEvent(name, { data }));
  }

  private fire(name: string, event: Event) {
    if (this.closed) return;
    for (const listener of [...(this.listeners.get(name) ?? [])]) {
      listener(event);
    }
  }
}

const streams = () => FakeEventSource.instances;
const lastStream = () => {
  const stream = streams().at(-1);
  if (!stream) throw new Error("no stream was opened");
  return stream;
};
const urlOf = (stream: FakeEventSource) => new URL(stream.url, "http://x");
const flush = () => vi.advanceTimersByTimeAsync(0);

const ok = () => new Response(null, { status: 204 });
const mockFetch = (reply: () => Promise<Response> = async () => ok()) =>
  vi.fn<typeof fetch>(reply);

const open: SseTransport[] = [];
const create = (options: Partial<Parameters<typeof sseTransport>[0]> = {}) => {
  const transport = sseTransport({
    url: "https://rt.example/events",
    reconnect: { jitter: 0 },
    ...options,
  });
  open.push(transport);
  return transport;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("EventSource", FakeEventSource);
  FakeEventSource.instances = [];
});

afterEach(() => {
  for (const transport of open.splice(0)) transport.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("sseTransport", () => {
  it("delivers an event on a topic's named event to its subscribers", async () => {
    const transport = create();
    const callback = vi.fn();
    const other = vi.fn();
    transport.subscribe("resource/posts", callback);
    transport.subscribe("resource/users", other);
    await flush();
    const stream = lastStream();
    stream.open();

    stream.message(
      "resource/posts",
      JSON.stringify({
        type: "created",
        payload: { ids: [1] },
        meta: { a: 1 },
      }),
    );
    stream.message("resource/posts", JSON.stringify({ payload: 1 }));

    expect(callback).toHaveBeenCalledExactlyOnceWith({
      topic: "resource/posts",
      type: "created",
      payload: { ids: [1] },
      meta: { a: 1 },
    });
    expect(other).not.toHaveBeenCalled();
  });

  it("opens the stream with the comma-joined topics and the token in the URL", async () => {
    const transport = create({
      getAuthToken: async () => "secret",
      withCredentials: true,
      topicFilterParam: "filter",
    });
    transport.subscribe("a", vi.fn());
    transport.subscribe("b", vi.fn());
    await flush();

    const url = urlOf(lastStream());
    expect(url.origin + url.pathname).toBe("https://rt.example/events");
    expect(url.searchParams.get("filter")).toBe("a,b");
    expect(url.searchParams.get("token")).toBe("secret");
    expect(lastStream().withCredentials).toBe(true);
  });

  it("rejects publish with no publishUrl", async () => {
    const transport = create({ fetch: mockFetch() });

    await expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).rejects.toThrow(/publishUrl/);
  });

  it("publish posts the topic and event as JSON", async () => {
    const fetchMock = mockFetch();
    const transport = create({
      publishUrl: "https://rt.example/publish",
      fetch: fetchMock,
    });

    await transport.publish("t", { type: "created", payload: { id: 1 } });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://rt.example/publish");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(init?.body).toBe(
      JSON.stringify({
        topic: "t",
        event: { type: "created", payload: { id: 1 } },
      }),
    );
    expect(init?.credentials).toBeUndefined();
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });

  it("a failed or non-ok publish rejects and reports send_failed", async () => {
    const onError = vi.fn();
    const cause = new Error("offline");
    const fetchMock = mockFetch();
    const transport = create({
      publishUrl: "https://rt.example/publish",
      fetch: fetchMock,
      onError,
    });

    fetchMock.mockRejectedValueOnce(cause);
    await expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).rejects.toBe(cause);
    expect(onError).toHaveBeenLastCalledWith({
      kind: "send_failed",
      topic: "t",
      cause,
      retrying: false,
    });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(
      transport.publish("t", { type: "created", payload: 1 }),
    ).rejects.toThrow(/500/);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: "send_failed",
        topic: "t",
        retrying: false,
      }),
    );
  });

  it("subscribes in one tick reopen the stream once with every topic", async () => {
    const transport = create();
    transport.subscribe("a", vi.fn());
    transport.subscribe("b", vi.fn());
    transport.subscribe("c", vi.fn());
    await flush();

    expect(streams()).toHaveLength(1);
    expect(urlOf(lastStream()).searchParams.get("topics")).toBe("a,b,c");
  });

  it("a subscribe that adds a topic reopens the stream with the new filter", async () => {
    const transport = create();
    transport.subscribe("a", vi.fn());
    await flush();
    const first = lastStream();
    first.open();

    transport.subscribe("a", vi.fn());
    await flush();
    expect(streams()).toHaveLength(1);

    transport.subscribe("b", vi.fn());
    await flush();

    expect(first.closed).toBe(true);
    expect(streams()).toHaveLength(2);
    expect(urlOf(lastStream()).searchParams.get("topics")).toBe("a,b");
  });

  it("a reopen for a new topic does not call onReconnect", async () => {
    const transport = create();
    const onReconnect = vi.fn();
    transport.onReconnect(onReconnect);
    transport.subscribe("a", vi.fn());
    await flush();
    lastStream().open();

    transport.subscribe("b", vi.fn());
    await flush();
    lastStream().open();

    expect(streams()).toHaveLength(2);
    expect(transport.getStatus()).toBe("connected");
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("follows idle, connected, reconnecting and disconnected", async () => {
    const transport = create({ reconnect: { jitter: 0, maxAttempts: 1 } });
    const seen: RealtimeConnectionStatus[] = [];
    transport.onStatusChange((status) => seen.push(status));
    expect(transport.getStatus()).toBe("idle");

    transport.subscribe("a", vi.fn());
    await flush();
    expect(transport.getStatus()).toBe("idle");
    lastStream().open();
    lastStream().fail();
    await vi.advanceTimersByTimeAsync(1000);
    lastStream().fail();

    expect(seen).toEqual(["connected", "reconnecting", "disconnected"]);
  });

  it("an error retries with backoff and calls onReconnect when the stream reopens", async () => {
    const onError = vi.fn();
    const transport = create({ onError });
    const onReconnect = vi.fn();
    transport.onReconnect(onReconnect);
    transport.subscribe("a", vi.fn());
    await flush();
    const first = lastStream();
    first.open();

    first.fail();
    expect(first.closed).toBe(true);
    expect(transport.getStatus()).toBe("reconnecting");
    expect(onError).toHaveBeenLastCalledWith({
      kind: "connect_failed",
      retrying: true,
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(streams()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(streams()).toHaveLength(2);
    expect(onReconnect).not.toHaveBeenCalled();

    lastStream().fail();
    await vi.advanceTimersByTimeAsync(1999);
    expect(streams()).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(streams()).toHaveLength(3);

    lastStream().open();
    expect(transport.getStatus()).toBe("connected");
    expect(onReconnect).toHaveBeenCalledOnce();

    lastStream().fail();
    await vi.advanceTimersByTimeAsync(1000);
    expect(streams()).toHaveLength(4);
  });

  it("stops after maxAttempts and sets disconnected", async () => {
    const onError = vi.fn();
    const transport = create({
      reconnect: { jitter: 0, maxAttempts: 2 },
      onError,
    });
    transport.subscribe("a", vi.fn());
    await flush();

    lastStream().fail();
    await vi.advanceTimersByTimeAsync(1000);
    lastStream().fail();
    await vi.advanceTimersByTimeAsync(2000);
    expect(streams()).toHaveLength(3);
    lastStream().fail();

    expect(transport.getStatus()).toBe("disconnected");
    expect(onError).toHaveBeenLastCalledWith({
      kind: "connect_failed",
      retrying: false,
    });
    await vi.advanceTimersByTimeAsync(60000);
    expect(streams()).toHaveLength(3);
  });

  it("does not retry when reconnect is disabled", async () => {
    const transport = create({ reconnect: { enabled: false } });
    transport.subscribe("a", vi.fn());
    await flush();

    lastStream().fail();
    await vi.advanceTimersByTimeAsync(60000);

    expect(transport.getStatus()).toBe("disconnected");
    expect(streams()).toHaveLength(1);
  });

  it("a rejected token reports auth_failed and opens no stream", async () => {
    const cause = new Error("expired");
    const onError = vi.fn();
    const transport = create({
      getAuthToken: async () => {
        throw cause;
      },
      onError,
    });
    transport.subscribe("a", vi.fn());
    await flush();

    expect(streams()).toHaveLength(0);
    expect(transport.getStatus()).toBe("disconnected");
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      kind: "auth_failed",
      cause,
      retrying: false,
    });
  });

  it("close while the token is pending opens no stream", async () => {
    let resolve: (token: string) => void = () => {};
    const transport = create({
      getAuthToken: () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    });
    transport.subscribe("a", vi.fn());
    await flush();

    transport.close();
    resolve("late");
    await flush();

    expect(streams()).toHaveLength(0);
    expect(transport.getStatus()).toBe("disconnected");
  });

  it("close closes the stream and a later subscribe opens again", async () => {
    const transport = create();
    const onReconnect = vi.fn();
    transport.onReconnect(onReconnect);
    transport.subscribe("a", vi.fn());
    await flush();
    const first = lastStream();
    first.open();

    transport.close();
    expect(first.closed).toBe(true);
    expect(transport.getStatus()).toBe("disconnected");

    transport.subscribe("b", vi.fn());
    await flush();
    lastStream().open();

    expect(streams()).toHaveLength(2);
    expect(urlOf(lastStream()).searchParams.get("topics")).toBe("a,b");
    expect(transport.getStatus()).toBe("connected");
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("the publish carries the bearer token and credentials when configured", async () => {
    const fetchMock = mockFetch();
    const transport = create({
      publishUrl: "https://rt.example/publish",
      fetch: fetchMock,
      getAuthToken: async () => "secret",
      withCredentials: true,
    });

    await transport.publish("t", { type: "created", payload: 1 });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer secret",
    );
    expect(init?.credentials).toBe("include");
  });

  it("an unparseable message is reported as parse_failed", async () => {
    const onError = vi.fn();
    const transport = create({ onError });
    const callback = vi.fn();
    transport.subscribe("a", callback);
    await flush();

    lastStream().message("a", "{not json");

    expect(callback).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        kind: "parse_failed",
        topic: "a",
        retrying: false,
      }),
    );
  });

  it("a throwing subscriber is reported as handler_threw and the others still run", async () => {
    const onError = vi.fn();
    const transport = create({ onError });
    const cause = new Error("boom");
    const after = vi.fn();
    transport.subscribe("a", () => {
      throw cause;
    });
    transport.subscribe("a", after);
    await flush();

    lastStream().message("a", JSON.stringify({ type: "updated", payload: 1 }));

    expect(after).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      kind: "handler_threw",
      topic: "a",
      cause,
      retrying: false,
    });
  });

  it("the idle close reports no error and returns to idle", async () => {
    const onError = vi.fn();
    const transport = create({ onError, idleDisconnectMs: 5000 });
    const onReconnect = vi.fn();
    transport.onReconnect(onReconnect);
    const stop = transport.subscribe("a", vi.fn());
    await flush();
    const first = lastStream();
    first.open();

    stop();
    await vi.advanceTimersByTimeAsync(4999);
    expect(first.closed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(first.closed).toBe(true);
    expect(transport.getStatus()).toBe("idle");
    expect(onError).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000);
    expect(streams()).toHaveLength(1);

    transport.subscribe("a", vi.fn());
    await flush();
    lastStream().open();
    expect(streams()).toHaveLength(2);
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("a subscribe before the idle timeout keeps the stream", async () => {
    const transport = create({ idleDisconnectMs: 5000 });
    const stop = transport.subscribe("a", vi.fn());
    await flush();
    lastStream().open();

    stop();
    await vi.advanceTimersByTimeAsync(4000);
    transport.subscribe("a", vi.fn());
    await vi.advanceTimersByTimeAsync(60000);

    expect(lastStream().closed).toBe(false);
    expect(streams()).toHaveLength(1);
    expect(transport.getStatus()).toBe("connected");
  });

  it("a hostile token or topic cannot add query parameters and the token never reaches a reported error", async () => {
    const token = "a&topics=x#frag";
    const errors: RealtimeTransportError[] = [];
    const fetchMock = mockFetch(async () => {
      throw new Error("offline");
    });
    const transport = create({
      getAuthToken: async () => token,
      publishUrl: "https://rt.example/publish",
      fetch: fetchMock,
      onError: (error) => errors.push(error),
    });
    transport.subscribe("posts&token=forged", () => {
      throw new Error("boom");
    });
    await flush();
    const stream = lastStream();

    const params = urlOf(stream).searchParams;
    expect([...params.keys()].sort()).toEqual(["token", "topics"]);
    expect(params.get("token")).toBe(token);
    expect(params.get("topics")).toBe("posts&token=forged");
    expect(stream.url).toContain(`token=${encodeURIComponent(token)}`);
    expect(stream.url).toContain(
      `topics=${encodeURIComponent("posts&token=forged")}`,
    );
    expect(new URL(stream.url).hash).toBe("");

    stream.open();
    stream.message("posts&token=forged", "{bad");
    stream.message(
      "posts&token=forged",
      JSON.stringify({ type: "created", payload: 1 }),
    );
    stream.fail();
    await transport
      .publish("posts&token=forged", { type: "created", payload: 1 })
      .catch(() => {});

    expect(errors.map((error) => error.kind)).toEqual([
      "parse_failed",
      "handler_threw",
      "connect_failed",
      "send_failed",
    ]);
    expect(JSON.stringify(errors)).not.toContain(token);
    expect(JSON.stringify(errors)).not.toContain("frag");
  });

  it("reports connect_failed without retrying when the stream cannot be constructed", async () => {
    vi.stubGlobal("EventSource", undefined);
    const onError = vi.fn();
    const transport = create({ onError });
    transport.subscribe("a", vi.fn());
    await flush();

    expect(transport.getStatus()).toBe("disconnected");
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      kind: "connect_failed",
      retrying: false,
    });
  });
});
