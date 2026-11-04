import { createTopicHub } from "./topic-hub";
import type { RealtimeTransport, RealtimeTransportError } from "./types";

export interface BroadcastChannelTransportOptions {
  /** The channel name; every tab that uses the same name shares events. */
  channel: string;
  /** Called for every transport error, like a listener from `onError()`. */
  onError?: (error: RealtimeTransportError) => void;
}

/** A `RealtimeTransport` with every optional member, plus `close()`. */
export interface BroadcastChannelTransport extends Required<RealtimeTransport> {
  /** Stops listening, closes the channel and sets `"disconnected"`. */
  close(): void;
}

interface Envelope {
  topic: string;
  event: { type: string };
}

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== "object" || value === null) return false;
  if (!("topic" in value) || typeof value.topic !== "string") return false;
  if (!("event" in value)) return false;
  const { event } = value;
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    typeof event.type === "string"
  );
}

/** Carries realtime events between the tabs of one browser, with no server. */
export function broadcastChannelTransport({
  channel,
  onError,
}: BroadcastChannelTransportOptions): BroadcastChannelTransport {
  if (typeof BroadcastChannel === "undefined") {
    throw new Error(
      "broadcastChannelTransport needs the global BroadcastChannel, which this environment does not have.",
    );
  }
  const hub = createTopicHub({ onError });
  const broadcast = new BroadcastChannel(channel);
  let closed = false;

  const onMessage = (message: MessageEvent) => {
    if (!isEnvelope(message.data)) {
      hub.report({
        kind: "parse_failed",
        cause: message.data,
        retrying: false,
      });
      return;
    }
    const { topic, event } = message.data;
    hub.dispatch({ payload: undefined, ...event, topic });
  };
  broadcast.addEventListener("message", onMessage);

  return {
    subscribe: hub.subscribe,
    async publish(topic, event) {
      if (closed) {
        throw new Error("broadcastChannelTransport is closed");
      }
      try {
        broadcast.postMessage({ topic, event });
      } catch (cause) {
        hub.report({ kind: "send_failed", topic, cause, retrying: false });
        throw cause;
      }
      hub.dispatch({ ...event, topic });
    },
    onReconnect: hub.onReconnect,
    onStatusChange: hub.onStatusChange,
    onError: hub.onError,
    getStatus: hub.getStatus,
    close() {
      if (closed) return;
      closed = true;
      broadcast.removeEventListener("message", onMessage);
      broadcast.close();
      hub.setStatus("disconnected");
    },
  };
}
