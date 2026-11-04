import { createTopicHub } from "./topic-hub";
import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
  RealtimeTransport,
  RealtimeTransportError,
} from "./types";

export interface MemoryTransportOptions {
  /** Waits this long between recording a publish and delivering it. */
  delayMs?: number;
  /** Called for every transport error, like a listener from `onError()`. */
  onError?: (error: RealtimeTransportError) => void;
}

/** A `RealtimeTransport` plus the members tests and demos drive it with. */
export interface MemoryTransport
  extends Required<
    Pick<
      RealtimeTransport,
      "onReconnect" | "onStatusChange" | "getStatus" | "onError"
    >
  > {
  subscribe: RealtimeTransport["subscribe"];
  publish: RealtimeTransport["publish"];
  /** Every event published so far, in order, whether or not anyone listened. */
  readonly publishedEvents: readonly RealtimeEvent[];
  /** Calls every `onReconnect` listener, as a real transport would after a drop. */
  simulateReconnect(): void;
  setStatus(status: RealtimeConnectionStatus): void;
}

/** Routes events by topic inside one process, with no server or client library. */
export function memoryTransport({
  delayMs,
  onError,
}: MemoryTransportOptions = {}): MemoryTransport {
  const hub = createTopicHub({ onError });
  const publishedEvents: RealtimeEvent[] = [];

  return {
    publishedEvents,
    subscribe: hub.subscribe,
    async publish(topic, event) {
      const full: RealtimeEvent = { topic, ...event };
      publishedEvents.push(full);
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      // Dispatched after the delay, so an unsubscribe during it is honoured.
      hub.dispatch(full);
    },
    onReconnect: hub.onReconnect,
    onStatusChange: hub.onStatusChange,
    onError: hub.onError,
    getStatus: hub.getStatus,
    simulateReconnect: hub.reconnected,
    setStatus: hub.setStatus,
  };
}
