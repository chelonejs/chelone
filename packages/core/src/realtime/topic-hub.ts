import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
  RealtimeTransport,
  RealtimeTransportError,
  SubscriptionCallback,
  Unsubscribe,
} from "./types";

export interface TopicHubOptions {
  /** Called for every reported error, like a listener from `onError()`. */
  onError?: (error: RealtimeTransportError) => void;
}

/**
 * The subscriber bookkeeping every transport needs: per-topic subscriptions,
 * isolated dispatch, and the status, reconnect and error listeners.
 */
export interface TopicHub
  extends Required<
    Pick<
      RealtimeTransport,
      "subscribe" | "onReconnect" | "onStatusChange" | "getStatus" | "onError"
    >
  > {
  /** Calls the subscribers of `event.topic`; a throwing one is reported. */
  dispatch(event: RealtimeEvent): void;
  /** Whether any subscriber is listening on `topic`. */
  has(topic: string): boolean;
  /** Every topic with a subscriber, in the order each was first subscribed. */
  topics(): string[];
  /** Calls the `onError` option and every `onError` listener. */
  report(error: RealtimeTransportError): void;
  setStatus(status: RealtimeConnectionStatus): void;
  /** Calls every `onReconnect` listener. */
  reconnected(): void;
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

// A throwing listener must not break the isolation of the ones after it.
const isolate = (call: () => void) => {
  try {
    call();
  } catch {}
};

/** Starts `"connected"`; a transport that connects asynchronously sets its own status. */
export function createTopicHub({ onError }: TopicHubOptions = {}): TopicHub {
  const subscribers = new Map<string, Set<Subscription>>();
  const reconnectListeners = new Set<() => void>();
  const statusListeners = new Set<(status: RealtimeConnectionStatus) => void>();
  const errorListeners = new Set<(error: RealtimeTransportError) => void>();
  let status: RealtimeConnectionStatus = "connected";

  const report = (error: RealtimeTransportError) => {
    for (const listener of [...(onError ? [onError] : []), ...errorListeners]) {
      isolate(() => listener(error));
    }
  };

  return {
    subscribe(topic, callback) {
      const subscription: Subscription = {
        // type-escape: server: the hub stores callbacks for any payload; dispatch passes the event on unchanged.
        callback: callback as SubscriptionCallback,
      };
      const set = subscribers.get(topic) ?? new Set();
      set.add(subscription);
      subscribers.set(topic, set);
      return () => {
        set.delete(subscription);
        if (set.size === 0 && subscribers.get(topic) === set) {
          subscribers.delete(topic);
        }
      };
    },
    dispatch(event) {
      const live = subscribers.get(event.topic);
      // The copy keeps a mid-dispatch unsubscribe from skipping a neighbour;
      // the live check keeps an unsubscribed callback from being called.
      for (const subscription of [...(live ?? [])]) {
        if (!live?.has(subscription)) continue;
        try {
          subscription.callback(event);
        } catch (cause) {
          report({
            kind: "handler_threw",
            topic: event.topic,
            cause,
            retrying: false,
          });
        }
      }
    },
    has: (topic) => subscribers.has(topic),
    topics: () => [...subscribers.keys()],
    report,
    onReconnect: (callback) => addListener(reconnectListeners, callback),
    onStatusChange: (callback) => addListener(statusListeners, callback),
    onError: (callback) => addListener(errorListeners, callback),
    getStatus: () => status,
    setStatus(next) {
      status = next;
      for (const listener of [...statusListeners])
        isolate(() => listener(next));
    },
    reconnected() {
      for (const listener of [...reconnectListeners]) isolate(listener);
    },
  };
}
