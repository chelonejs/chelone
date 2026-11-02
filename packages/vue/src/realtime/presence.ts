import {
  assertRealtimeDataProvider,
  createMicroStore,
  createPresenceSession,
  type Identifier,
  type PresenceSessionState,
  type PresenceUser,
  presenceTopic,
  toPresenceUser,
} from "@chelone/core";
import {
  type ComputedRef,
  computed,
  inject,
  type MaybeRefOrGetter,
  toValue,
  watchEffect,
} from "vue";
import { useOptionalIdentity } from "../auth/auth-hooks";
import { useCheloneContext } from "../context";
import { RecordContextKey } from "../record/record-context";
import { useResourceContext } from "../resource-context";
import { useMicroStore } from "../store/use-micro-store";

export interface UsePresenceOptions {
  /** Defaults to the topic of the ambient resource and record. */
  topic?: MaybeRefOrGetter<string | undefined>;
  /** Defaults to the auth provider's identity. */
  user?: MaybeRefOrGetter<PresenceUser | undefined>;
  /** How often the announce is republished. Default 15000. */
  heartbeatMs?: MaybeRefOrGetter<number | undefined>;
  /** A session unheard for longer than this is dropped. Default 30000. */
  staleMs?: MaybeRefOrGetter<number | undefined>;
  /** Announces only while true. Defaults to true. */
  enabled?: MaybeRefOrGetter<boolean>;
}

const idleState: PresenceSessionState = { users: [] };

/**
 * Announces the current user on a topic for as long as the component lives
 * and returns the other users there. A changing topic or user leaves the old
 * topic and joins the new one. With no topic, no user or `enabled` false it
 * announces nothing and `users` stays empty.
 */
export function usePresence({
  topic,
  user,
  heartbeatMs,
  staleMs,
  enabled,
}: UsePresenceOptions = {}): { users: ComputedRef<PresenceUser[]> } {
  const { dataProvider } = useCheloneContext();
  const ambientResource = useResourceContext();
  // The injected ref, not `useRecordContext()`'s snapshot: an Edit view
  // publishes its record after the fetch lands.
  const ambientRecord = inject(RecordContextKey, null);
  const { identity } = useOptionalIdentity();

  // Computeds, so a refetched record or identity with the same value does not restart.
  const resolvedTopic = computed(() => {
    const explicit = toValue(topic);
    if (explicit !== undefined) return explicit;
    const id = ambientRecord?.value?.id as Identifier | undefined;
    return ambientResource !== undefined && id != null
      ? presenceTopic(ambientResource, id)
      : undefined;
  });
  const resolvedUser = computed(
    () =>
      toValue(user) ??
      (identity.value ? toPresenceUser(identity.value) : undefined),
  );
  const userId = computed(() => resolvedUser.value?.id);
  const userName = computed(() => resolvedUser.value?.name);
  const userAvatar = computed(() => resolvedUser.value?.avatar);

  // The session changes with the topic, but `useMicroStore` binds one store
  // for the component's life, so each session is mirrored into this one.
  const mirror = createMicroStore<PresenceSessionState>(idleState);
  const state = useMicroStore(mirror);

  watchEffect((onCleanup) => {
    const topicName = resolvedTopic.value;
    const id = userId.value;
    const name = userName.value;
    if (enabled !== undefined && !toValue(enabled)) return;
    if (topicName === undefined || id === undefined || name === undefined)
      return;
    assertRealtimeDataProvider(dataProvider, "usePresence");

    const avatar = userAvatar.value;
    const session = createPresenceSession({
      dataProvider,
      topic: topicName,
      user: { id, name, ...(avatar !== undefined ? { avatar } : {}) },
      heartbeatMs: toValue(heartbeatMs),
      staleMs: toValue(staleMs),
    });
    const unsubscribe = session.store.subscribe(() =>
      mirror.setState(session.store.getSnapshot()),
    );
    session.start();
    mirror.setState(session.store.getSnapshot());

    onCleanup(() => {
      unsubscribe();
      session.stop();
      mirror.setState(idleState);
    });
  });

  return { users: computed(() => state.value.users) };
}
