import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
  RealtimeTransportError,
} from "@chelone/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type {
  SupabaseBroadcastMessage,
  SupabaseRealtimeChannel,
  SupabaseRealtimeClient,
  SupabaseRealtimeTransportOptions,
} from "./realtime-transport";
import { supabaseRealtimeTransport } from "./realtime-transport";

type SubscribeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";
type StatusCallback = (status: string, error?: Error) => void;

interface FakeChannel {
  name: string;
  options: { config: { private: boolean } };
  sent: object[];
  on: ReturnType<typeof vi.fn<SupabaseRealtimeChannel["on"]>>;
  subscribe: ReturnType<typeof vi.fn<(callback: StatusCallback) => object>>;
  send: ReturnType<typeof vi.fn<(message: object) => Promise<string>>>;
  /** What the server pushes: a broadcast message, as supabase-js hands it over. */
  receive(payload: SupabaseBroadcastMessage["payload"]): void;
  /** What supabase-js reports to the `subscribe` callback. */
  status(status: SubscribeStatus, error?: Error): void;
}

const fakeClient = () => {
  const channels: FakeChannel[] = [];
  const removed: FakeChannel[] = [];
  // What every channel answers to a send.
  const behaviour: { sendResult: string | Error } = { sendResult: "ok" };
  const client = {
    channel(name, options): FakeChannel {
      let onStatus: StatusCallback = () => {};
      let onBroadcast: (message: SupabaseBroadcastMessage) => void = () => {};
      const channel: FakeChannel = {
        name,
        options,
        sent: [],
        on: vi.fn<SupabaseRealtimeChannel["on"]>((_type, _filter, callback) => {
          onBroadcast = callback;
          return channel;
        }),
        subscribe: vi.fn((callback: StatusCallback) => {
          onStatus = callback;
          return channel;
        }),
        send: vi.fn(async (message: object) => {
          channel.sent.push(message);
          if (behaviour.sendResult instanceof Error) throw behaviour.sendResult;
          return behaviour.sendResult;
        }),
        receive: (payload) => onBroadcast({ payload }),
        status: (status, error) => onStatus(status, error),
      };
      channels.push(channel);
      return channel;
    },
    async removeChannel(channel) {
      for (const fake of channels) if (fake === channel) removed.push(fake);
      return "ok";
    },
  } satisfies SupabaseRealtimeClient;
  return { client, channels, removed, behaviour };
};

const setup = (options?: SupabaseRealtimeTransportOptions) => {
  const fake = fakeClient();
  const transport = supabaseRealtimeTransport(fake.client, options);
  const statuses: RealtimeConnectionStatus[] = [];
  const errors: RealtimeTransportError[] = [];
  const reconnects: number[] = [];
  transport.onStatusChange((status) => statuses.push(status));
  transport.onError((error) => errors.push(error));
  transport.onReconnect(() => reconnects.push(1));
  return { ...fake, transport, statuses, errors, reconnects };
};

const collect = () => {
  const events: RealtimeEvent[] = [];
  return { events, callback: (event: RealtimeEvent) => events.push(event) };
};

describe("supabaseRealtimeTransport", () => {
  it("the first subscriber opens a private channel named with the prefix and the topic", () => {
    const { transport, channels } = setup();

    transport.subscribe("posts", () => {});
    transport.subscribe("posts", () => {});

    expect(channels).toHaveLength(1);
    expect(channels[0]?.name).toBe("chelone:posts");
    expect(channels[0]?.options).toEqual({
      config: { private: true, broadcast: { self: true, ack: true } },
    });
    expect(channels[0]?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "chelone" },
      expect.any(Function),
    );
    expect(channels[0]?.subscribe).toHaveBeenCalledTimes(1);
  });

  it("opens a public channel only when private is false", () => {
    const { transport, channels } = setup({
      private: false,
      channelPrefix: "app:",
    });

    transport.subscribe("posts", () => {});

    expect(channels[0]?.name).toBe("app:posts");
    expect(channels[0]?.options.config.private).toBe(false);
  });

  it("a broadcast reaches the topic's subscribers as a chelone event", () => {
    const { transport, channels } = setup();
    const posts = collect();
    const other = collect();
    transport.subscribe("posts", posts.callback);
    transport.subscribe("users", other.callback);

    channels[0]?.receive({
      type: "updated",
      payload: { id: 1 },
      meta: { by: "ada" },
    });
    channels[0]?.receive({ type: "created" });

    expect(posts.events).toEqual([
      {
        topic: "posts",
        type: "updated",
        payload: { id: 1 },
        meta: { by: "ada" },
      },
      { topic: "posts", type: "created", payload: undefined },
    ]);
    expect(other.events).toEqual([]);
  });

  it("the last unsubscribe removes the channel", () => {
    const { transport, channels, removed, statuses } = setup();
    const first = transport.subscribe("posts", () => {});
    const second = transport.subscribe("posts", () => {});
    channels[0]?.status("SUBSCRIBED");

    first();
    expect(removed).toEqual([]);
    second();
    second();

    expect(removed).toEqual([channels[0]]);
    expect(statuses).toEqual(["connected", "idle"]);
    expect(transport.getStatus()).toBe("idle");
  });

  it("publish sends a broadcast on the joined channel", async () => {
    const { transport, channels } = setup();
    transport.subscribe("posts", () => {});

    await transport.publish("posts", { type: "updated", payload: { id: 1 } });

    expect(channels).toHaveLength(1);
    expect(channels[0]?.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "chelone",
      payload: { type: "updated", payload: { id: 1 } },
    });
  });

  it("publish with no subscriber sends on a channel it then removes", async () => {
    const { transport, channels, removed } = setup();

    await transport.publish("posts", { type: "created", payload: 1 });

    expect(channels).toHaveLength(1);
    expect(channels[0]?.name).toBe("chelone:posts");
    expect(channels[0]?.sent).toEqual([
      {
        type: "broadcast",
        event: "chelone",
        payload: { type: "created", payload: 1 },
      },
    ]);
    expect(removed).toEqual([channels[0]]);
    expect(transport.getStatus()).toBe("idle");
  });

  it("a send that is not ok rejects and reports send_failed", async () => {
    const { transport, removed, errors, behaviour } = setup();
    transport.subscribe("posts", () => {});
    behaviour.sendResult = "timed out";

    await expect(
      transport.publish("posts", { type: "updated", payload: 1 }),
    ).rejects.toThrow("timed out");

    expect(errors).toEqual([
      {
        kind: "send_failed",
        topic: "posts",
        cause: expect.any(Error),
        retrying: false,
      },
    ]);
    expect(removed).toEqual([]);
  });

  it("a send that throws still removes the short-lived channel", async () => {
    const { transport, channels, removed, errors, behaviour } = setup();
    behaviour.sendResult = new Error("offline");

    await expect(
      transport.publish("users", { type: "created", payload: 1 }),
    ).rejects.toThrow("offline");

    expect(errors.map((error) => error.kind)).toEqual(["send_failed"]);
    expect(removed).toEqual(channels);
  });

  it("status follows SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT and CLOSED", () => {
    const { transport, channels, statuses, errors } = setup();
    expect(transport.getStatus()).toBe("idle");
    transport.subscribe("posts", () => {});
    transport.subscribe("users", () => {});
    const [posts, users] = channels;

    posts?.status("SUBSCRIBED");
    expect(transport.getStatus()).toBe("idle");
    users?.status("SUBSCRIBED");
    expect(transport.getStatus()).toBe("connected");

    const cause = new Error("join failed");
    posts?.status("CHANNEL_ERROR", cause);
    expect(transport.getStatus()).toBe("reconnecting");
    users?.status("TIMED_OUT");
    posts?.status("SUBSCRIBED");
    expect(transport.getStatus()).toBe("reconnecting");
    users?.status("SUBSCRIBED");
    expect(transport.getStatus()).toBe("connected");

    users?.status("CLOSED");
    expect(transport.getStatus()).toBe("disconnected");

    expect(statuses).toEqual([
      "connected",
      "reconnecting",
      "connected",
      "disconnected",
    ]);
    expect(errors).toEqual([
      { kind: "connect_failed", topic: "posts", cause, retrying: true },
      {
        kind: "connect_failed",
        topic: "users",
        cause: undefined,
        retrying: true,
      },
    ]);
  });

  it("a channel that joins again after an error calls onReconnect", () => {
    const { transport, channels, reconnects } = setup();
    transport.subscribe("posts", () => {});
    const channel = channels[0];

    channel?.status("SUBSCRIBED");
    expect(reconnects).toHaveLength(0);
    channel?.status("CHANNEL_ERROR");
    expect(reconnects).toHaveLength(0);
    channel?.status("SUBSCRIBED");
    expect(reconnects).toHaveLength(1);
    channel?.status("SUBSCRIBED");
    expect(reconnects).toHaveLength(1);
  });

  it("a broadcast with no type is reported as parse_failed", () => {
    const { transport, channels, errors } = setup();
    const posts = collect();
    transport.subscribe("posts", posts.callback);

    channels[0]?.receive({ payload: 1 });
    channels[0]?.receive("text");
    channels[0]?.receive(undefined);

    expect(posts.events).toEqual([]);
    expect(errors).toEqual([
      {
        kind: "parse_failed",
        topic: "posts",
        cause: { payload: 1 },
        retrying: false,
      },
      { kind: "parse_failed", topic: "posts", cause: "text", retrying: false },
      {
        kind: "parse_failed",
        topic: "posts",
        cause: undefined,
        retrying: false,
      },
    ]);
  });

  it("a throwing subscriber is reported as handler_threw and the others still run", () => {
    const onError = vi.fn();
    const { transport, channels, errors } = setup({ onError });
    const after = collect();
    const failure = new Error("boom");
    transport.subscribe("posts", () => {
      throw failure;
    });
    transport.subscribe("posts", after.callback);

    channels[0]?.receive({ type: "updated", payload: 1 });

    expect(after.events).toHaveLength(1);
    const expected = {
      kind: "handler_threw",
      topic: "posts",
      cause: failure,
      retrying: false,
    };
    expect(errors).toEqual([expected]);
    expect(onError).toHaveBeenCalledWith(expected);
  });

  it("close removes every channel and sets disconnected", async () => {
    const { transport, channels, removed, statuses } = setup();
    transport.subscribe("posts", () => {});
    transport.subscribe("users", () => {});
    channels[0]?.status("SUBSCRIBED");
    channels[1]?.status("SUBSCRIBED");

    transport.close();

    expect(removed).toEqual(channels);
    expect(transport.getStatus()).toBe("disconnected");
    expect(statuses.at(-1)).toBe("disconnected");
    channels[0]?.status("CLOSED");
    expect(statuses.filter((s) => s === "disconnected")).toHaveLength(1);
    await expect(
      transport.publish("posts", { type: "created", payload: 1 }),
    ).rejects.toThrow("closed");
  });

  it("accepts a real SupabaseClient", () => {
    expectTypeOf<SupabaseClient>().toExtend<SupabaseRealtimeClient>();
    const client = createClient("http://localhost:54321", "anon-key");
    expect(supabaseRealtimeTransport(client).getStatus()).toBe("idle");
  });
});
