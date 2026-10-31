import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
  RealtimeTransport,
  RealtimeTransportError,
  SubscriptionCallback,
  Unsubscribe,
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

// Each subscription is its own entry, so subscribing one callback twice and
// unsubscribing once leaves the other subscription alive.
interface Subscription {
  callback: SubscriptionCallback;
}

const addListener = <T>(listeners: Set<T>, listener: T): Unsubscribe => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Routes events by topic inside one process, with no server or client library. */
export function memoryTransport({
  delayMs,
  onError,
}: MemoryTransportOptions = {}): MemoryTransport {
  const subscribers = new Map<string, Set<Subscription>>();
  const publishedEvents: RealtimeEvent[] = [];
  const reconnectListeners = new Set<() => void>();
  const statusListeners = new Set<(status: RealtimeConnectionStatus) => void>();
  const errorListeners = new Set<(error: RealtimeTransportError) => void>();
  let status: RealtimeConnectionStatus = "connected";

  const report = (error: RealtimeTransportError) => {
    onError?.(error);
    for (const listener of [...errorListeners]) listener(error);
  };

  return {
    publishedEvents,
    subscribe(topic, callback) {
      const subscription: Subscription = {
        callback: callback as SubscriptionCallback,
      };
      const set = subscribers.get(topic) ?? new Set();
      set.add(subscription);
      subscribers.set(topic, set);
      return () => {
        set.delete(subscription);
      };
    },
    async publish(topic, event) {
      const full: RealtimeEvent = { topic, ...event };
      publishedEvents.push(full);
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      // Looked up after the delay, so an unsubscribe during it is honoured.
      for (const { callback } of [...(subscribers.get(topic) ?? [])]) {
        try {
          callback(full);
        } catch (cause) {
          report({ kind: "handler_threw", topic, cause, retrying: false });
        }
      }
    },
    onReconnect: (callback) => addListener(reconnectListeners, callback),
    onStatusChange: (callback) => addListener(statusListeners, callback),
    onError: (callback) => addListener(errorListeners, callback),
    getStatus: () => status,
    simulateReconnect() {
      for (const listener of [...reconnectListeners]) listener();
    },
    setStatus(next) {
      status = next;
      for (const listener of [...statusListeners]) listener(next);
    },
  };
}
