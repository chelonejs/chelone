import { lockKey, locksKey, resourceKey } from "../data/keys";
import type { DataContext } from "../data/query-options";
import { hasUnsettledUndoables, onUndoablesSettled } from "../data/undoable";
import type { Identifier } from "../resource/identifier";
import type { ResourceMap } from "../resource/registry";
import { assertRealtimeDataProvider } from "./realtime-data-provider";
import {
  lockResourceTopic,
  lockTopic,
  recordTopic,
  resourceTopic,
} from "./topics";
import type { Unsubscribe } from "./types";

export interface LiveSubscription {
  /** Removes every topic and reconnect listener this subscription added. */
  stop(): void;
  /** Invalidates once if an event arrived while `paused` returned true. */
  resume(): void;
}

export interface LiveOptions {
  /** While it returns true, events are held; `resume()` replays them as one invalidation. */
  paused?: () => boolean;
}

interface LiveSpec {
  caller: string;
  topics: string[];
  invalidate: () => void;
  options?: LiveOptions;
  /** Hold events while an undoable mutation is pending: a refetch would restore its optimistic delete. */
  holdWhileUndoable: boolean;
}

function subscribeLive<TResources extends ResourceMap>(
  ctx: DataContext<TResources>,
  spec: LiveSpec,
): LiveSubscription {
  const { dataProvider } = ctx;
  assertRealtimeDataProvider(dataProvider, spec.caller);
  let stopped = false;
  let scheduled = false;
  let missed = false;

  // One microtask folds the events of a tick into a single invalidation.
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!stopped) spec.invalidate();
    });
  };

  let stopWaiting: Unsubscribe | undefined;

  // Nothing invalidates when an undoable settles, so a held event is replayed
  // then. The replay goes back through `onEvent`, which re-checks `paused`.
  const holdForUndoable = () => {
    if (stopWaiting) return;
    stopWaiting = onUndoablesSettled(() => {
      stopWaiting?.();
      stopWaiting = undefined;
      onEvent();
    });
  };

  const onEvent = () => {
    if (stopped) return;
    if (spec.holdWhileUndoable && hasUnsettledUndoables()) {
      holdForUndoable();
      return;
    }
    if (spec.options?.paused?.()) {
      missed = true;
      return;
    }
    schedule();
  };

  const unsubscribes: Unsubscribe[] = spec.topics.map((topic) =>
    dataProvider.subscribe(topic, onEvent),
  );
  // A subscription with no topics has nothing to catch up on.
  if (spec.topics.length > 0 && dataProvider.onReconnect) {
    unsubscribes.push(dataProvider.onReconnect(onEvent));
  }

  return {
    stop() {
      stopped = true;
      stopWaiting?.();
      stopWaiting = undefined;
      for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
    },
    resume() {
      if (stopped || !missed) return;
      missed = false;
      onEvent();
    },
  };
}

/** Invalidates everything under the resource except lock queries, which have their own subscribers. */
function invalidateResource(ctx: DataContext<ResourceMap>, resource: string) {
  void ctx.queryClient.invalidateQueries({
    queryKey: resourceKey(resource),
    predicate: ({ queryKey }) =>
      queryKey[1] !== "getLock" && queryKey[1] !== "getLocks",
  });
}

/** Refetches the resource's lists, shows and edits when anything in it changes or the connection comes back. */
export function subscribeLiveResource<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: DataContext<TResources>,
  resource: TName,
  options?: LiveOptions,
): LiveSubscription {
  return subscribeLive(ctx, {
    caller: "subscribeLiveResource",
    topics: [resourceTopic(resource)],
    invalidate: () => invalidateResource(ctx, resource),
    options,
    holdWhileUndoable: true,
  });
}

/** Like `subscribeLiveResource`, for the events of one record. */
export function subscribeLiveRecord<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: DataContext<TResources>,
  resource: TName,
  id: Identifier,
  options?: LiveOptions,
): LiveSubscription {
  return subscribeLive(ctx, {
    caller: "subscribeLiveRecord",
    topics: [recordTopic(resource, id)],
    invalidate: () => invalidateResource(ctx, resource),
    options,
    holdWhileUndoable: true,
  });
}

/** Like `subscribeLiveRecord`, for several records: one invalidation however many of them change. */
export function subscribeLiveRecords<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: DataContext<TResources>,
  resource: TName,
  ids: Identifier[],
  options?: LiveOptions,
): LiveSubscription {
  return subscribeLive(ctx, {
    caller: "subscribeLiveRecords",
    // `1` and `"1"` give the same topic; listen once.
    topics: [...new Set(ids.map((id) => recordTopic(resource, id)))],
    invalidate: () => invalidateResource(ctx, resource),
    options,
    holdWhileUndoable: true,
  });
}

/** Refetches one record's lock when it is taken or released. */
export function subscribeLiveLock<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: DataContext<TResources>,
  resource: TName,
  id: Identifier,
): LiveSubscription {
  return subscribeLive(ctx, {
    caller: "subscribeLiveLock",
    topics: [lockTopic(resource, id)],
    invalidate: () =>
      void ctx.queryClient.invalidateQueries({
        queryKey: lockKey(resource, { id }),
      }),
    holdWhileUndoable: false,
  });
}

/** Refetches the resource's lock list when any lock is taken or released. */
export function subscribeLiveLocks<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName): LiveSubscription {
  return subscribeLive(ctx, {
    caller: "subscribeLiveLocks",
    topics: [lockResourceTopic(resource)],
    invalidate: () =>
      void ctx.queryClient.invalidateQueries({ queryKey: locksKey(resource) }),
    holdWhileUndoable: false,
  });
}
