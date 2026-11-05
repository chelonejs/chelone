import type { UserIdentity } from "../auth/types";
import { isRecord } from "../guards";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import type { RealtimeTransport } from "./types";

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
}

export type PresenceSessionDataProvider = Pick<
  RealtimeTransport,
  "subscribe" | "publish" | "onReconnect"
>;

export interface PresenceSessionState {
  /** The other users on the topic, one entry per user id, in the order first seen. */
  users: PresenceUser[];
}

export interface PresenceSessionOptions {
  dataProvider: PresenceSessionDataProvider;
  topic: string;
  user: PresenceUser;
  /** Tells this tab from another tab of the same user. Random by default. */
  sessionId?: string;
  /** How often the announce is republished. Default 15000. */
  heartbeatMs?: number;
  /** A session unheard for longer than this is dropped. Default 30000. */
  staleMs?: number;
  /** The clock for staleness. The wire carries no timestamp. */
  now?: () => number;
  /** Called with a failed publish or a handler that threw. */
  onError?: (error: Error) => void;
}

export interface PresenceSession {
  store: MicroStore<PresenceSessionState>;
  start(): void;
  stop(): void;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const sameUser = (a: PresenceUser, b: PresenceUser): boolean =>
  a.id === b.id && a.name === b.name && a.avatar === b.avatar;

const isPresenceUser = (value: unknown): value is PresenceUser =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string";

/**
 * Announces `user` on `topic` and keeps the other users who announce there.
 * Self is told by `sessionId`, not by user id, so a second tab of the same
 * person still counts. Staleness is measured with `now()` at receipt, never
 * from a time the sender wrote.
 */
export function createPresenceSession({
  dataProvider,
  topic,
  user,
  sessionId = crypto.randomUUID(),
  heartbeatMs = 15_000,
  staleMs = 30_000,
  now = Date.now,
  onError,
}: PresenceSessionOptions): PresenceSession {
  const store = createMicroStore<PresenceSessionState>({ users: [] });
  // Other sessions by id, with when each was last heard.
  const sessions = new Map<string, { user: PresenceUser; heardAt: number }>();
  let running = false;
  let unsubscribe: (() => void) | undefined;
  let unsubscribeReconnect: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let sweep: ReturnType<typeof setInterval> | undefined;

  const report = (cause: unknown) => {
    try {
      onError?.(toError(cause));
    } catch {}
  };

  const publish = (type: string, payload: unknown) => {
    try {
      dataProvider.publish(topic, { type, payload }).catch(report);
    } catch (cause) {
      report(cause);
    }
  };

  const announce = () => publish("presence", { sessionId, user });

  // Keeps users already listed in place, so a second session of a user, or a
  // session leaving, never moves them.
  const refresh = () => {
    const live = new Map<string, PresenceUser>();
    for (const entry of sessions.values()) live.set(entry.user.id, entry.user);
    const previous = store.getSnapshot().users;
    const users = previous.flatMap((listed) => live.get(listed.id) ?? []);
    const listedIds = new Set(users.map((listed) => listed.id));
    for (const [id, other] of live) if (!listedIds.has(id)) users.push(other);
    const unchanged =
      users.length === previous.length &&
      users.every((other, index) => {
        const prior = previous[index];
        return prior !== undefined && sameUser(other, prior);
      });
    if (!unchanged) store.setState({ users });
  };

  const handle = ({ type, payload }: { type: string; payload: unknown }) => {
    try {
      if (!isRecord(payload) || typeof payload.sessionId !== "string") return;
      const from = payload.sessionId;
      if (from === sessionId) return;
      if (type === "presence_leave") {
        sessions.delete(from);
        refresh();
      } else if (type === "presence" && isPresenceUser(payload.user)) {
        const known = sessions.has(from);
        sessions.set(from, { user: payload.user, heardAt: now() });
        // Before the store, whose subscribers may throw: the newcomer must hear us.
        if (!known) announce();
        refresh();
      }
    } catch (cause) {
      report(cause);
    }
  };

  return {
    store,
    start() {
      if (running) return;
      running = true;
      unsubscribe = dataProvider.subscribe(topic, handle);
      unsubscribeReconnect = dataProvider.onReconnect?.(announce);
      announce();
      heartbeat = setInterval(announce, heartbeatMs);
      sweep = setInterval(
        () => {
          try {
            const cutoff = now() - staleMs;
            for (const [id, entry] of sessions)
              if (entry.heardAt < cutoff) sessions.delete(id);
            refresh();
          } catch (cause) {
            report(cause);
          }
        },
        Math.min(staleMs / 2, 5000),
      );
    },
    stop() {
      if (!running) return;
      running = false;
      unsubscribe?.();
      unsubscribe = undefined;
      unsubscribeReconnect?.();
      unsubscribeReconnect = undefined;
      clearInterval(heartbeat);
      clearInterval(sweep);
      heartbeat = sweep = undefined;
      publish("presence_leave", { sessionId });
      sessions.clear();
      try {
        store.setState({ users: [] });
      } catch (cause) {
        report(cause);
      }
    },
  };
}

export function toPresenceUser(identity: UserIdentity): PresenceUser {
  const id = String(identity.id);
  return {
    id,
    name: identity.fullName || id,
    ...(typeof identity.avatar === "string" ? { avatar: identity.avatar } : {}),
  };
}

/** The first letters of the first two words, or `?` for a blank name. */
export function getPresenceInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (words.length === 0) return "?";
  return words
    .map((word) => Array.from(word)[0])
    .join("")
    .toUpperCase();
}
