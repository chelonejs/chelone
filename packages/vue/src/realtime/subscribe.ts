import {
  assertRealtimeDataProvider,
  createRealtimeStatusStore,
  type Identifier,
  type RealtimeConnectionStatus,
  type RealtimeTransportError,
  recordTopic,
  resourceTopic,
  type SubscriptionCallback,
  type Unsubscribe,
} from "@chelone/core";
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
  watchEffect,
} from "vue";
import { useCheloneContext } from "../context";
import { useMicroStore } from "../store/use-micro-store";

export interface UseSubscribeOptions {
  /** Subscribes only while true. Defaults to true. */
  enabled?: MaybeRefOrGetter<boolean>;
}

/**
 * Listens to `topic` for as long as the component lives and `enabled` is
 * true. A changing topic or `enabled` resubscribes. The callback is read at
 * subscribe time; a Vue callback closes over live refs, so it needs no
 * latest-callback ref.
 */
export function useSubscribe<P = unknown>(
  topic: MaybeRefOrGetter<string>,
  callback: SubscriptionCallback<P>,
  { enabled }: UseSubscribeOptions = {},
): void {
  const { dataProvider } = useCheloneContext();
  watchEffect((onCleanup) => {
    if (enabled !== undefined && !toValue(enabled)) return;
    assertRealtimeDataProvider(dataProvider, "useSubscribe");
    onCleanup(dataProvider.subscribe(toValue(topic), callback));
  });
}

/** Returns `subscribe(topic, callback)` for subscriptions made on demand; the caller owns the unsubscribe. */
export function useSubscribeCallback() {
  const { dataProvider } = useCheloneContext();
  assertRealtimeDataProvider(dataProvider, "useSubscribeCallback");
  return <P = unknown>(
    topic: string,
    callback: SubscriptionCallback<P>,
  ): Unsubscribe => dataProvider.subscribe(topic, callback);
}

/** Listens to one record's topic. Does nothing while `id` is null or undefined; `0` is an id. */
export function useSubscribeToRecord<P = unknown>(
  resource: MaybeRefOrGetter<string>,
  id: MaybeRefOrGetter<Identifier | null | undefined>,
  callback: SubscriptionCallback<P>,
  { enabled }: UseSubscribeOptions = {},
): void {
  useSubscribe(
    () => recordTopic(toValue(resource), toValue(id) ?? ""),
    callback,
    {
      enabled: () =>
        toValue(id) != null && (enabled === undefined || toValue(enabled)),
    },
  );
}

/** Listens to a resource's topic: creates, and the ids of any write. */
export function useSubscribeToRecordList<P = unknown>(
  resource: MaybeRefOrGetter<string>,
  callback: SubscriptionCallback<P>,
  options: UseSubscribeOptions = {},
): void {
  useSubscribe(() => resourceTopic(toValue(resource)), callback, options);
}

/** Returns `publish(topic, event)` over the data provider. */
export function usePublish() {
  const { dataProvider } = useCheloneContext();
  assertRealtimeDataProvider(dataProvider, "usePublish");
  return dataProvider.publish.bind(dataProvider);
}

/** Calls `callback` each time the transport reconnects. Does nothing when the transport cannot tell. */
export function useOnReconnect(callback: () => void): void {
  const { dataProvider } = useCheloneContext();
  assertRealtimeDataProvider(dataProvider, "useOnReconnect");
  const unsubscribe = dataProvider.onReconnect?.(callback);
  if (unsubscribe) onScopeDispose(unsubscribe);
}

/** The connection status and the latest transport error, as refs that follow the transport. */
export function useRealtimeStatus(): {
  status: ComputedRef<RealtimeConnectionStatus>;
  lastError: ComputedRef<RealtimeTransportError | null>;
} {
  const { dataProvider } = useCheloneContext();
  assertRealtimeDataProvider(dataProvider, "useRealtimeStatus");
  const state = useMicroStore(createRealtimeStatusStore(dataProvider));
  return {
    status: computed(() => state.value.status),
    lastError: computed(() => state.value.lastError),
  };
}
