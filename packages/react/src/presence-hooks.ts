import {
  assertRealtimeDataProvider,
  createPresenceSession,
  type PresenceUser,
  presenceTopic,
  toPresenceUser,
} from "@chelone/core";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useOptionalIdentity } from "./auth-hooks";
import { useCheloneContext } from "./context";
import { useRecordContext } from "./record/record-context";
import { useResourceContext } from "./resource";

export interface UsePresenceOptions {
  /** Defaults to the presence topic of the resource and record contexts. */
  topic?: string;
  /** Defaults to the auth provider's identity. */
  user?: PresenceUser;
  /** How often the announce is republished. Default 15000. */
  heartbeatMs?: number;
  /** A user unheard for longer than this is dropped. Default 30000. */
  staleMs?: number;
  /** With `false` the hook announces nothing and returns no users. Default `true`. */
  enabled?: boolean;
}

const NO_USERS: PresenceUser[] = [];
const idleStore = {
  subscribe: () => () => {},
  getSnapshot: () => ({ users: NO_USERS }),
};

/**
 * The other users on a topic, while the component is mounted. A second tab
 * of the same user is left out. With no topic,
 * no user or `enabled` false it announces nothing. Changing the data provider,
 * topic, user or an interval leaves the old topic before joining the next.
 * Needs a realtime data provider.
 */
export function usePresence({
  topic: topicOption,
  user: userOption,
  heartbeatMs,
  staleMs,
  enabled = true,
}: UsePresenceOptions = {}): PresenceUser[] {
  const { dataProvider } = useCheloneContext();
  const resource = useResourceContext();
  const record = useRecordContext();
  const { identity } = useOptionalIdentity();

  const recordId = record?.id;
  const topic =
    topicOption ??
    (resource && recordId !== undefined && recordId !== null
      ? presenceTopic(resource, recordId)
      : undefined);
  const user = userOption ?? (identity ? toPresenceUser(identity) : undefined);
  const userId = user?.id;
  const userName = user?.name;
  const userAvatar = user?.avatar;

  const session = useMemo(() => {
    if (!enabled || !topic || userId === undefined || userName === undefined) {
      return null;
    }
    assertRealtimeDataProvider(dataProvider, "usePresence");
    return createPresenceSession({
      dataProvider,
      topic,
      user: {
        id: userId,
        name: userName,
        ...(userAvatar !== undefined ? { avatar: userAvatar } : {}),
      },
      heartbeatMs,
      staleMs,
    });
  }, [
    dataProvider,
    enabled,
    topic,
    userId,
    userName,
    userAvatar,
    heartbeatMs,
    staleMs,
  ]);

  useEffect(() => {
    if (!session) return;
    session.start();
    return () => session.stop();
  }, [session]);

  const store = session?.store ?? idleStore;
  const users = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().users,
    () => store.getSnapshot().users,
  );
  // The session counts a second tab of the same person; the list leaves them out.
  return useMemo(
    () =>
      users.some((other) => other.id === userId)
        ? users.filter((other) => other.id !== userId)
        : users,
    [users, userId],
  );
}
