import { isRecord } from "../guards";
import {
  type RealtimeReconnectConfig,
  reconnectDelay,
  resolveReconnectConfig,
} from "./reconnect-backoff";
import { createTopicHub } from "./topic-hub";
import type {
  RealtimeEvent,
  RealtimeTransport,
  RealtimeTransportError,
} from "./types";

export interface SseTransportOptions {
  /** The stream URL; the topic filter and the token are appended to its query. */
  url: string;
  /** Where `publish` POSTs. Without it `publish` rejects. */
  publishUrl?: string;
  /** The bearer token for the stream (as `token`) and for the publish POST. */
  getAuthToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  /** Sent to `EventSource` and as `credentials: "include"` on the publish POST. */
  withCredentials?: boolean;
  reconnect?: RealtimeReconnectConfig;
  /** How long the stream stays open with no subscriber. Default 30000. */
  idleDisconnectMs?: number;
  /** The query parameter that carries the topics. Default `"topics"`. */
  topicFilterParam?: string;
  /** Called for every transport error, like a listener from `onError()`. */
  onError?: (error: RealtimeTransportError) => void;
  /** Used for the publish POST. Default the global `fetch`. */
  fetch?: typeof fetch;
}

/** A `RealtimeTransport` with every optional member, plus `close()`. */
export interface SseTransport extends Required<RealtimeTransport> {
  /** Closes the stream and sets `"disconnected"`; a later subscribe opens again. */
  close(): void;
}

// A message without a `type` is not an event, so it is dropped.
function isWireEvent(value: unknown): value is Omit<RealtimeEvent, "topic"> {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    (value.meta === undefined || isRecord(value.meta))
  );
}

const DEFAULT_IDLE_DISCONNECT_MS = 30000;

/**
 * Receives realtime events over server-sent events, one named event per topic,
 * and publishes with a POST.
 */
export function sseTransport({
  url,
  publishUrl,
  getAuthToken,
  withCredentials = false,
  reconnect,
  idleDisconnectMs = DEFAULT_IDLE_DISCONNECT_MS,
  topicFilterParam = "topics",
  onError,
  fetch: fetchOption,
}: SseTransportOptions): SseTransport {
  const hub = createTopicHub({ onError });
  hub.setStatus("idle");
  const config = resolveReconnectConfig(reconnect);

  let source: EventSource | null = null;
  // The topics in the open stream's filter.
  let filter = new Set<string>();
  // Stands for "a stream is open, opening or waiting to retry".
  let active = false;
  // Bumped to cancel an `open()` that is waiting on the token.
  let generation = 0;
  let attempt = 0;
  // Set by an error after the stream had opened: the next open is a reconnect.
  let dropped = false;
  let openQueued = false;
  // The topics are read after the token, so a subscribe in the wait is covered.
  let resolvingToken = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const readToken = async () => (await getAuthToken?.()) || undefined;

  const stopStream = () => {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    source?.close();
    source = null;
    filter = new Set();
  };

  const streamUrl = (topics: string[], token: string | undefined) => {
    const query = [
      `${encodeURIComponent(topicFilterParam)}=${encodeURIComponent(topics.join(","))}`,
      ...(token === undefined ? [] : [`token=${encodeURIComponent(token)}`]),
    ].join("&");
    return `${url}${url.includes("?") ? "&" : "?"}${query}`;
  };

  // Reports the failure, then waits to retry or gives up.
  const retryOrGiveUp = (
    failure: (retrying: boolean) => RealtimeTransportError,
  ) => {
    const retrying = config.enabled && attempt < config.maxAttempts;
    hub.report(failure(retrying));
    if (!retrying) {
      active = false;
      hub.setStatus("disconnected");
      return;
    }
    hub.setStatus("reconnecting");
    retryTimer = setTimeout(
      () => {
        retryTimer = undefined;
        void open(true);
      },
      reconnectDelay(attempt, config),
    );
    attempt += 1;
  };

  const handleError = (stream: EventSource, opened: boolean) => {
    if (source !== stream) return;
    stopStream();
    dropped ||= opened;
    retryOrGiveUp((retrying) => ({ kind: "connect_failed", retrying }));
  };

  // `isRetry`: a failure of the token here is one more failed retry, not a stop.
  async function open(isRetry = false): Promise<void> {
    stopStream();
    const current = ++generation;
    active = true;
    resolvingToken = true;
    let token: string | undefined;
    try {
      token = await readToken();
    } catch (cause) {
      if (current !== generation) return;
      resolvingToken = false;
      if (isRetry) {
        retryOrGiveUp((retrying) => ({ kind: "auth_failed", cause, retrying }));
        return;
      }
      active = false;
      hub.report({ kind: "auth_failed", cause, retrying: false });
      hub.setStatus("disconnected");
      return;
    }
    if (current !== generation) return;
    resolvingToken = false;
    const topics = hub.topics();
    if (topics.length === 0) {
      goIdle();
      return;
    }

    let stream: EventSource;
    try {
      stream = new EventSource(streamUrl(topics, token), { withCredentials });
    } catch {
      // No cause: the browser's message can quote the URL, and the URL has the token.
      active = false;
      hub.report({ kind: "connect_failed", retrying: false });
      hub.setStatus("disconnected");
      return;
    }
    source = stream;
    filter = new Set(topics);
    let opened = false;

    stream.addEventListener("open", () => {
      if (source !== stream) return;
      opened = true;
      attempt = 0;
      hub.setStatus("connected");
      if (dropped) {
        dropped = false;
        hub.reconnected();
      }
    });
    stream.addEventListener("error", () => handleError(stream, opened));
    for (const topic of topics) {
      stream.addEventListener(topic, (message) => {
        if (source !== stream || !("data" in message)) return;
        if (typeof message.data === "string") receive(topic, message.data);
      });
    }
  }

  const receive = (topic: string, data: string) => {
    let parsed: ReturnType<typeof JSON.parse>;
    try {
      parsed = JSON.parse(data);
    } catch (cause) {
      hub.report({ kind: "parse_failed", topic, cause, retrying: false });
      return;
    }
    if (isWireEvent(parsed)) hub.dispatch({ ...parsed, topic });
  };

  // The subscribes of one tick share one open.
  const queueOpen = () => {
    if (openQueued) return;
    openQueued = true;
    void Promise.resolve().then(() => {
      if (!openQueued) return;
      openQueued = false;
      if (!active) attempt = 0;
      return open();
    });
  };

  function goIdle() {
    generation += 1;
    resolvingToken = false;
    clearTimeout(idleTimer);
    idleTimer = undefined;
    stopStream();
    active = false;
    dropped = false;
    if (hub.getStatus() !== "idle") hub.setStatus("idle");
  }

  return {
    subscribe(topic, callback) {
      const stop = hub.subscribe(topic, callback);
      clearTimeout(idleTimer);
      idleTimer = undefined;
      // A pending retry or token wait reads the topics when it runs.
      const covered =
        retryTimer !== undefined || resolvingToken || filter.has(topic);
      if (!active || !covered) queueOpen();
      return () => {
        stop();
        // After `close()` or a give-up nothing is open, so there is nothing to idle.
        if (hub.topics().length > 0 || !active) return;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(goIdle, idleDisconnectMs);
      };
    },
    async publish(topic, event) {
      if (!publishUrl) {
        throw new Error("sseTransport needs the publishUrl option to publish");
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      try {
        const token = await readToken();
        if (token !== undefined) headers.Authorization = `Bearer ${token}`;
      } catch (cause) {
        hub.report({ kind: "auth_failed", topic, cause, retrying: false });
        throw cause;
      }
      const doFetch: typeof fetch =
        fetchOption ?? ((input, init) => globalThis.fetch(input, init));
      try {
        const response = await doFetch(publishUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ topic, event }),
          credentials: withCredentials ? "include" : undefined,
        });
        if (!response.ok) {
          throw new Error(`Publishing to ${topic} failed: ${response.status}`);
        }
      } catch (cause) {
        hub.report({ kind: "send_failed", topic, cause, retrying: false });
        throw cause;
      }
    },
    onReconnect: hub.onReconnect,
    onStatusChange: hub.onStatusChange,
    onError: hub.onError,
    getStatus: hub.getStatus,
    close() {
      openQueued = false;
      generation += 1;
      resolvingToken = false;
      clearTimeout(idleTimer);
      idleTimer = undefined;
      stopStream();
      active = false;
      dropped = false;
      hub.setStatus("disconnected");
    },
  };
}
