import {
  type RealtimeReconnectConfig,
  reconnectDelay,
  resolveReconnectConfig,
} from "./reconnect-backoff";
import { createTopicHub } from "./topic-hub";
import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
  RealtimeTransport,
  RealtimeTransportError,
} from "./types";

export interface WebSocketTransportOptions {
  url: string;
  /** Subprotocols offered on every connection. */
  protocols?: string[];
  /** Read before every connection, so a retry carries a fresh token. */
  getAuthToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  /**
   * Where the token goes. `"query"` (default) adds a URL-encoded `token`
   * parameter; `"subprotocol"` offers it after `protocols` and keeps it out of
   * the URL.
   */
  authMode?: "query" | "subprotocol";
  reconnect?: RealtimeReconnectConfig;
  /** Close the socket after this long with no subscriber. Default 30000. */
  idleDisconnectMs?: number;
  /** Ping this often; a ping with no reply by the next one is a drop. Default 30000. */
  heartbeatMs?: number;
  /** Called for every transport error, like a listener from `onError()`. */
  onError?: (error: RealtimeTransportError) => void;
}

/** A `RealtimeTransport` with every optional member, plus `close()`. */
export interface WebSocketTransport extends Required<RealtimeTransport> {
  /**
   * Closes the socket, rejects queued publishes and sets `"disconnected"`.
   * A later subscribe or publish opens again.
   */
  close(): void;
}

/** A server frame has the shape of the event it carries; a missing `payload` is `undefined`. */
type ServerFrame = RealtimeEvent;

interface QueuedPublish {
  topic: string;
  event: Omit<RealtimeEvent, "topic">;
  resolve: () => void;
  reject: (reason: Error) => void;
}

interface Connection {
  socket: WebSocket;
  opened: boolean;
  awaitingPong: boolean;
  onOpen: () => void;
  onMessage: (message: MessageEvent) => void;
  onClose: (event: CloseEvent) => void;
}

const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isServerFrame(value: unknown): value is ServerFrame {
  if (!isObject(value)) return false;
  if (!("topic" in value) || typeof value.topic !== "string") return false;
  if (!("type" in value) || typeof value.type !== "string") return false;
  return !("meta" in value) || value.meta === undefined || isObject(value.meta);
}

const isPong = (value: unknown): value is { op: "pong" } =>
  isObject(value) && "op" in value && value.op === "pong";

type ParsedFrame =
  | { kind: "pong" }
  | { kind: "event"; event: ServerFrame }
  | { kind: "invalid"; cause: Error };

function parseFrame(data: string | Blob | ArrayBufferLike): ParsedFrame {
  try {
    if (typeof data !== "string") throw new Error("frame is not text");
    const frame = JSON.parse(data);
    if (isPong(frame)) return { kind: "pong" };
    if (isServerFrame(frame)) return { kind: "event", event: frame };
    throw new Error("frame is not a realtime event");
  } catch (cause) {
    return {
      kind: "invalid",
      cause: cause instanceof Error ? cause : new Error("frame is invalid"),
    };
  }
}

/** Carries realtime events over one WebSocket and reconnects with backoff. */
export function webSocketTransport({
  url,
  protocols = [],
  getAuthToken,
  authMode = "query",
  reconnect,
  idleDisconnectMs = 30000,
  heartbeatMs = 30000,
  onError,
}: WebSocketTransportOptions): WebSocketTransport {
  const hub = createTopicHub({ onError });
  const backoff = resolveReconnectConfig(reconnect);
  hub.setStatus("idle");

  let connection: Connection | null = null;
  // True from the start of a connect, through the token wait, until the socket exists.
  let connecting = false;
  // A close() or idle close bumps this so a connect still waiting on a token gives up.
  let epoch = 0;
  let attempt = 0;
  // Set by a lost connection that had been open, so the next open is a reconnect.
  let lostConnection = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let queue: QueuedPublish[] = [];

  const setStatus = (status: RealtimeConnectionStatus) => {
    if (hub.getStatus() !== status) hub.setStatus(status);
  };

  const rejectQueue = (reason: Error) => {
    const rejected = queue;
    queue = [];
    for (const publish of rejected) publish.reject(reason);
  };

  const send = (
    target: Connection,
    frame: object,
    topic?: string,
  ): Error | null => {
    try {
      target.socket.send(JSON.stringify(frame));
      return null;
    } catch (cause) {
      hub.report({ kind: "send_failed", topic, cause, retrying: false });
      return cause instanceof Error ? cause : new Error("send failed");
    }
  };

  const stopHeartbeat = () => {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  };

  // Stops listening before closing, so the close event of a socket we ended
  // ourselves is never mistaken for a failure.
  const detach = (target: Connection) => {
    stopHeartbeat();
    target.socket.removeEventListener("open", target.onOpen);
    target.socket.removeEventListener("message", target.onMessage);
    target.socket.removeEventListener("close", target.onClose);
    try {
      target.socket.close();
    } catch {}
    if (connection === target) connection = null;
  };

  const teardown = () => {
    epoch += 1;
    connecting = false;
    attempt = 0;
    lostConnection = false;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    clearTimeout(idleTimer);
    idleTimer = undefined;
    if (connection) detach(connection);
  };

  // Arms the idle close while nothing listens, and disarms it otherwise.
  const touchIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = undefined;
    if (hub.topics().length > 0) return;
    idleTimer = setTimeout(() => {
      idleTimer = undefined;
      if (hub.topics().length > 0) return;
      if (!connection && !connecting && retryTimer === undefined) return;
      teardown();
      rejectQueue(new Error("webSocketTransport went idle"));
      setStatus("idle");
    }, idleDisconnectMs);
  };

  const giveUp = (reason: Error) => {
    rejectQueue(reason);
    setStatus("disconnected");
  };

  const lose = (
    target: Connection,
    clean: boolean,
    cause: { code?: number; reason: string },
  ) => {
    detach(target);
    clearTimeout(idleTimer);
    if (target.opened) lostConnection = true;
    if (clean) {
      setStatus("disconnected");
      return;
    }
    if (backoff.enabled && attempt < backoff.maxAttempts) {
      const delay = reconnectDelay(attempt, backoff);
      attempt += 1;
      hub.report({ kind: "connect_failed", cause, retrying: true });
      setStatus("reconnecting");
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void connect();
      }, delay);
      touchIdle();
      return;
    }
    hub.report({ kind: "connect_failed", cause, retrying: false });
    giveUp(new Error("webSocketTransport could not connect"));
  };

  const heartbeat = (target: Connection) => {
    if (target.awaitingPong) {
      lose(target, false, { reason: "heartbeat missed" });
      return;
    }
    target.awaitingPong = true;
    send(target, { op: "ping" });
  };

  const handleMessage = (target: Connection, message: MessageEvent) => {
    target.awaitingPong = false;
    const parsed = parseFrame(message.data);
    if (parsed.kind === "pong") return;
    if (parsed.kind === "invalid") {
      hub.report({
        kind: "parse_failed",
        cause: parsed.cause,
        retrying: false,
      });
      return;
    }
    const { topic, type, payload, meta } = parsed.event;
    hub.dispatch({ topic, type, payload, ...(meta ? { meta } : {}) });
  };

  const handleOpen = (target: Connection) => {
    target.opened = true;
    attempt = 0;
    setStatus("connected");
    for (const topic of hub.topics()) send(target, { op: "subscribe", topic });
    const flushed = queue;
    queue = [];
    for (const { topic, event, resolve, reject } of flushed) {
      const failure = send(target, { op: "publish", topic, event }, topic);
      if (failure) reject(failure);
      else resolve();
    }
    heartbeatTimer = setInterval(() => heartbeat(target), heartbeatMs);
    touchIdle();
    if (lostConnection) {
      lostConnection = false;
      hub.reconnected();
    }
  };

  const open = (token: string | null | undefined) => {
    let target: Connection;
    try {
      const withToken = token && authMode === "query";
      const address = withToken
        ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
        : url;
      const offered =
        token && authMode === "subprotocol" ? [...protocols, token] : protocols;
      const socket =
        offered.length > 0
          ? new WebSocket(address, offered)
          : new WebSocket(address);
      target = {
        socket,
        opened: false,
        awaitingPong: false,
        onOpen: () => handleOpen(target),
        onMessage: (message) => handleMessage(target, message),
        onClose: (event) =>
          lose(target, event.wasClean, {
            code: event.code,
            reason: event.reason,
          }),
      };
    } catch (error) {
      // The message of a constructor error can quote the URL or subprotocol, token included.
      const name = error instanceof Error ? error.name : "Error";
      const cause = new Error(`WebSocket constructor failed: ${name}`);
      hub.report({ kind: "connect_failed", cause, retrying: false });
      giveUp(cause);
      return;
    }
    connection = target;
    target.socket.addEventListener("open", target.onOpen);
    target.socket.addEventListener("message", target.onMessage);
    target.socket.addEventListener("close", target.onClose);
  };

  async function connect(): Promise<void> {
    connecting = true;
    const startedAt = epoch;
    let token: string | null | undefined;
    if (getAuthToken) {
      try {
        token = await getAuthToken();
      } catch (cause) {
        if (epoch !== startedAt) return;
        connecting = false;
        hub.report({ kind: "auth_failed", cause, retrying: false });
        giveUp(cause instanceof Error ? cause : new Error("auth failed"));
        return;
      }
      if (epoch !== startedAt) return;
    }
    connecting = false;
    open(token);
  }

  const ensureOpen = () => {
    if (connection || connecting || retryTimer !== undefined) return;
    attempt = 0;
    void connect();
  };

  return {
    subscribe(topic, callback) {
      const first = !hub.has(topic);
      const unsubscribe = hub.subscribe(topic, callback);
      touchIdle();
      if (first && connection?.opened) {
        send(connection, { op: "subscribe", topic }, topic);
      }
      ensureOpen();
      let done = false;
      return () => {
        if (done) return;
        done = true;
        unsubscribe();
        if (!hub.has(topic) && connection?.opened) {
          send(connection, { op: "unsubscribe", topic }, topic);
        }
        touchIdle();
      };
    },
    publish(topic, event) {
      if (connection?.opened) {
        touchIdle();
        const failure = send(
          connection,
          { op: "publish", topic, event },
          topic,
        );
        return failure ? Promise.reject(failure) : Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        queue.push({ topic, event, resolve, reject });
        touchIdle();
        ensureOpen();
      });
    },
    onReconnect: hub.onReconnect,
    onStatusChange: hub.onStatusChange,
    onError: hub.onError,
    getStatus: hub.getStatus,
    close() {
      teardown();
      rejectQueue(new Error("webSocketTransport is closed"));
      setStatus("disconnected");
    },
  };
}
