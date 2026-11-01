import {
  assertRealtimeDataProvider,
  createRealtimeStatusStore,
  type DataProvider,
  type Identifier,
  type MicroStore,
  type RealtimeDataProvider,
  type RealtimeEvent,
  type RealtimeStatusState,
  recordTopic,
  resourceTopic,
  type SubscriptionCallback,
  type Unsubscribe,
} from "@chelone/core";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useCheloneContext } from "./context";
import { useEvent } from "./util/use-event";

export interface UseSubscribeOptions {
  /** `false` skips the subscription, and the realtime check with it. */
  enabled?: boolean;
}

/**
 * Calls `callback` for each event on `topic`. A new `callback` every render
 * never resubscribes; only the data provider, the topic or `enabled` does.
 */
export function useSubscribe(
  topic: string,
  callback: SubscriptionCallback,
  { enabled = true }: UseSubscribeOptions = {},
): void {
  const { dataProvider } = useCheloneContext();
  const onEvent = useEvent(callback);

  useEffect(() => {
    if (!enabled) return;
    assertRealtimeDataProvider(dataProvider, "useSubscribe");
    return dataProvider.subscribe(topic, onEvent);
  }, [dataProvider, topic, enabled, onEvent]);
}

/** A `subscribe(topic, callback)` that returns its unsubscribe, for subscribing outside an effect. */
export function useSubscribeCallback(): (
  topic: string,
  callback: SubscriptionCallback,
) => Unsubscribe {
  const { dataProvider } = useCheloneContext();
  return useCallback(
    (topic, callback) => {
      assertRealtimeDataProvider(dataProvider, "useSubscribeCallback");
      return dataProvider.subscribe(topic, callback);
    },
    [dataProvider],
  );
}

/** `useSubscribe` for one record's topic; waits while `id` is `null` or `undefined`. */
export function useSubscribeToRecord(
  resource: string,
  id: Identifier | null | undefined,
  callback: SubscriptionCallback,
  { enabled = true }: UseSubscribeOptions = {},
): void {
  const hasId = id !== null && id !== undefined;
  useSubscribe(hasId ? recordTopic(resource, id) : "", callback, {
    enabled: enabled && hasId,
  });
}

/** `useSubscribe` for the topic of a whole resource. */
export function useSubscribeToRecordList(
  resource: string,
  callback: SubscriptionCallback,
  options?: UseSubscribeOptions,
): void {
  useSubscribe(resourceTopic(resource), callback, options);
}

/** A `publish(topic, event)` for one data provider; it throws when the provider is not realtime. */
export function usePublish(): (
  topic: string,
  event: Omit<RealtimeEvent, "topic">,
) => Promise<void> {
  const { dataProvider } = useCheloneContext();
  return useCallback(
    (topic, event) => {
      assertRealtimeDataProvider(dataProvider, "usePublish");
      return dataProvider.publish(topic, event);
    },
    [dataProvider],
  );
}

/** Calls the latest `callback` after the transport reconnects; does nothing when it cannot say. */
export function useOnReconnect(callback: () => void): void {
  const { dataProvider } = useCheloneContext();
  const onReconnected = useEvent(callback);

  useEffect(() => {
    return (dataProvider as Partial<RealtimeDataProvider>).onReconnect?.(
      onReconnected,
    );
  }, [dataProvider, onReconnected]);
}

// One store per provider, so every consumer shares one set of transport listeners.
const statusStores = new WeakMap<
  DataProvider,
  MicroStore<RealtimeStatusState>
>();

function statusStoreFor(dataProvider: DataProvider) {
  let store = statusStores.get(dataProvider);
  if (!store) {
    store = createRealtimeStatusStore(
      dataProvider as Partial<RealtimeDataProvider>,
    );
    statusStores.set(dataProvider, store);
  }
  return store;
}

/** The connection status and the last transport error; `idle` when the transport reports neither. */
export function useRealtimeStatus(): RealtimeStatusState {
  const { dataProvider } = useCheloneContext();
  const store = statusStoreFor(dataProvider);
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
