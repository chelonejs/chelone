import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
  RealtimeTransport,
  RealtimeTransportError,
} from "@chelone/core";
import { createTopicHub } from "@chelone/core";

/** The chelone broadcast event name; the chelone type travels in the payload. */
const BROADCAST_EVENT = "chelone";

/** What supabase-js hands to a broadcast listener; `payload` is whatever a client sent. */
export interface SupabaseBroadcastMessage {
  // type-escape: json: JSON broadcast by any client on the channel, checked by `isWireEvent` before use.
  payload?: unknown;
}

/** The part of a supabase-js `RealtimeChannel` this transport calls. */
export interface SupabaseRealtimeChannel {
  on(
    type: "broadcast",
    filter: { event: string },
    callback: (message: SupabaseBroadcastMessage) => void,
  ): object;
  subscribe(callback: (status: string, error?: Error) => void): object;
  send(message: {
    type: "broadcast";
    event: string;
    payload: object;
  }): Promise<string>;
}

/** The part of a `SupabaseClient` this transport calls. */
export interface SupabaseRealtimeClient {
  channel(
    name: string,
    options: {
      config: {
        private: boolean;
        broadcast: { self: boolean; ack: boolean };
      };
    },
  ): SupabaseRealtimeChannel;
  removeChannel(channel: SupabaseRealtimeChannel): Promise<string>;
}

export interface SupabaseRealtimeTransportOptions {
  /** Put before the topic in the channel name. Default `"chelone:"`. */
  channelPrefix?: string;
  /**
   * Whether channels are private. Default `true`: a private channel needs a
   * policy on `realtime.messages`, and a public one lets anyone with the
   * project's key read the events, record data included.
   */
  private?: boolean;
  /** Called for every transport error, like a listener from `onError()`. */
  onError?: (error: RealtimeTransportError) => void;
}

/** A `RealtimeTransport` with every optional member, plus `close()`. */
export interface SupabaseRealtimeTransport extends Required<RealtimeTransport> {
  /** Removes every channel and sets `"disconnected"`. A later publish rejects. */
  close(): void;
}

type JoinState = "joining" | "subscribed" | "errored" | "closed";

interface Joined {
  /** Unset until the channel is opened, which waits for an earlier use of its name to end. */
  channel?: SupabaseRealtimeChannel;
  /** Settles once `channel` is opened or the entry is dropped. */
  ready: Promise<void>;
  state: JoinState;
  // Set by an error, so the next join is a reconnect.
  failed: boolean;
}

const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type WireEvent = Omit<RealtimeEvent, "topic">;

function isWireEvent(value: unknown): value is WireEvent {
  if (!isObject(value)) return false;
  if (!("type" in value) || typeof value.type !== "string") return false;
  return !("meta" in value) || value.meta === undefined || isObject(value.meta);
}

/** Carries realtime events over Supabase Realtime broadcast channels, one per topic. */
export function supabaseRealtimeTransport(
  client: SupabaseRealtimeClient,
  {
    channelPrefix = "chelone:",
    private: isPrivate = true,
    onError,
  }: SupabaseRealtimeTransportOptions = {},
): SupabaseRealtimeTransport {
  const hub = createTopicHub({ onError });
  hub.setStatus("idle");

  const joined = new Map<string, Joined>();
  // Channels opened only to publish, so close() can remove one still sending.
  const shortLived = new Set<SupabaseRealtimeChannel>();
  // supabase-js hands back the open channel for a name, and a removed channel
  // stays open until the server acknowledges the leave. So each topic's channel
  // is used by one owner at a time: this holds the end of the last owner.
  const busy = new Map<string, Promise<void>>();
  let closed = false;

  const setStatus = (status: RealtimeConnectionStatus) => {
    if (hub.getStatus() !== status) hub.setStatus(status);
  };

  // A channel still joining leaves the status as it was.
  const refreshStatus = () => {
    if (closed) return;
    const states = [...joined.values()].map(({ state }) => state);
    if (states.length === 0) setStatus("idle");
    else if (states.includes("errored")) setStatus("reconnecting");
    else if (states.includes("closed")) setStatus("disconnected");
    else if (states.every((state) => state === "subscribed")) {
      setStatus("connected");
    }
  };

  const open = (topic: string) =>
    client.channel(channelPrefix + topic, {
      config: { private: isPrivate, broadcast: { self: true, ack: true } },
    });

  const remove = async (channel: SupabaseRealtimeChannel) => {
    try {
      await client.removeChannel(channel);
    } catch {}
  };

  // Runs `task` after the earlier ones on `topic`; a rejection goes to the caller only.
  const occupy = <T>(topic: string, task: () => Promise<T>): Promise<T> => {
    const previous = busy.get(topic);
    const run = previous ? previous.then(task) : task();
    const end = run.then(
      () => {},
      () => {},
    );
    busy.set(topic, end);
    void end.then(() => {
      if (busy.get(topic) === end) busy.delete(topic);
    });
    return run;
  };

  const handleBroadcast = (
    topic: string,
    message: SupabaseBroadcastMessage,
  ) => {
    const wire = message.payload;
    if (!isWireEvent(wire)) {
      hub.report({ kind: "parse_failed", topic, cause: wire, retrying: false });
      return;
    }
    const event: RealtimeEvent = {
      topic,
      type: wire.type,
      payload: wire.payload,
      ...(wire.meta ? { meta: wire.meta } : {}),
    };
    hub.dispatch(event);
  };

  const handleStatus = (
    topic: string,
    entry: Joined,
    status: string,
    error?: Error,
  ) => {
    // A channel we already removed still reports its CLOSED.
    if (closed || joined.get(topic) !== entry) return;
    if (status === "SUBSCRIBED") {
      const rejoined = entry.failed;
      entry.state = "subscribed";
      entry.failed = false;
      refreshStatus();
      if (rejoined) hub.reconnected();
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      entry.state = "errored";
      entry.failed = true;
      // supabase-js rejoins on its own.
      hub.report({
        kind: "connect_failed",
        topic,
        cause: error,
        retrying: true,
      });
      refreshStatus();
    } else if (status === "CLOSED") {
      entry.state = "closed";
      refreshStatus();
    }
  };

  const join = (topic: string) => {
    const entry: Joined = {
      ready: Promise.resolve(),
      state: "joining",
      failed: false,
    };
    joined.set(topic, entry);
    const start = () => {
      if (closed || joined.get(topic) !== entry) return;
      const channel = open(topic);
      entry.channel = channel;
      channel.on("broadcast", { event: BROADCAST_EVENT }, (message) =>
        handleBroadcast(topic, message),
      );
      channel.subscribe((status, error) =>
        handleStatus(topic, entry, status, error),
      );
    };
    const previous = busy.get(topic);
    if (previous) entry.ready = previous.then(start);
    else start();
  };

  const leave = (topic: string) => {
    const entry = joined.get(topic);
    if (!entry) return;
    joined.delete(topic);
    const { channel } = entry;
    if (channel) void occupy(topic, () => remove(channel));
    refreshStatus();
  };

  const send = async (
    channel: SupabaseRealtimeChannel,
    topic: string,
    event: Omit<RealtimeEvent, "topic">,
  ) => {
    const payload = {
      type: event.type,
      payload: event.payload,
      ...(event.meta ? { meta: event.meta } : {}),
    };
    try {
      const answer = await channel.send({
        type: "broadcast",
        event: BROADCAST_EVENT,
        payload,
      });
      if (answer !== "ok") {
        throw new Error(`Supabase Realtime answered "${answer}" to the send`);
      }
    } catch (cause) {
      hub.report({ kind: "send_failed", topic, cause, retrying: false });
      throw cause;
    }
  };

  return {
    subscribe(topic, callback) {
      const first = !hub.has(topic);
      const unsubscribe = hub.subscribe(topic, callback);
      if (first && !closed) join(topic);
      let done = false;
      return () => {
        if (done) return;
        done = true;
        unsubscribe();
        if (!hub.has(topic)) leave(topic);
      };
    },
    async publish(topic, event) {
      if (closed) throw new Error("supabaseRealtimeTransport is closed");
      for (let entry = joined.get(topic); entry; entry = joined.get(topic)) {
        await entry.ready;
        if (closed) throw new Error("supabaseRealtimeTransport is closed");
        if (entry.channel && joined.get(topic) === entry) {
          await send(entry.channel, topic, event);
          return;
        }
      }
      await occupy(topic, async () => {
        if (closed) throw new Error("supabaseRealtimeTransport is closed");
        const channel = open(topic);
        shortLived.add(channel);
        try {
          await send(channel, topic, event);
        } finally {
          shortLived.delete(channel);
          await remove(channel);
        }
      });
    },
    onReconnect: hub.onReconnect,
    onStatusChange: hub.onStatusChange,
    onError: hub.onError,
    getStatus: hub.getStatus,
    close() {
      if (closed) return;
      closed = true;
      const channels = [
        ...[...joined.values()].flatMap(({ channel }) =>
          channel ? [channel] : [],
        ),
        ...shortLived,
      ];
      joined.clear();
      shortLived.clear();
      for (const channel of channels) void remove(channel);
      setStatus("disconnected");
    },
  };
}
