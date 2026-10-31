import type { DataProvider } from "../data/types";
import type { ResourceMap } from "../resource/registry";
import type {
  LockProvider,
  RealtimeDataProvider,
  RealtimeDataProviderOptions,
  RealtimeTransport,
} from "./types";

const noLockProvider = (method: string) =>
  Promise.reject(
    new Error(
      `realtimeDataProvider: ${method}() called but no LockProvider was configured`,
    ),
  );

/**
 * Adds `subscribe`, `publish` and the lock methods to any data provider. The
 * optional transport members are copied only when the transport has them, so
 * `"getStatus" in dataProvider` tells a caller whether it can read a status.
 * Wrap the result of `combineDataProviders`, not the reverse: it keeps only
 * the nine verbs.
 */
export function realtimeDataProvider<
  TResources extends ResourceMap = ResourceMap,
>(
  base: DataProvider<TResources>,
  transport: RealtimeTransport,
  { locks }: RealtimeDataProviderOptions = {},
): RealtimeDataProvider<TResources> {
  const lockMethods: LockProvider = {
    lock: (resource, params) =>
      locks ? locks.lock(resource, params) : noLockProvider("lock"),
    unlock: (resource, params) =>
      locks ? locks.unlock(resource, params) : noLockProvider("unlock"),
    getLock: (resource, params) =>
      locks ? locks.getLock(resource, params) : noLockProvider("getLock"),
    getLocks: (resource, params) =>
      locks ? locks.getLocks(resource, params) : noLockProvider("getLocks"),
  };

  const provider: RealtimeDataProvider<TResources> = {
    ...base,
    ...lockMethods,
    subscribe: (topic, callback) => transport.subscribe(topic, callback),
    publish: (topic, event) => transport.publish(topic, event),
  };
  if (transport.onReconnect) {
    provider.onReconnect = transport.onReconnect.bind(transport);
  }
  if (transport.onStatusChange) {
    provider.onStatusChange = transport.onStatusChange.bind(transport);
  }
  if (transport.getStatus) {
    provider.getStatus = transport.getStatus.bind(transport);
  }
  if (transport.onError) {
    provider.onError = transport.onError.bind(transport);
  }
  return provider;
}

/** True when `dataProvider` was wrapped with `realtimeDataProvider()`. */
export function isRealtimeDataProvider<
  TResources extends ResourceMap = ResourceMap,
>(
  dataProvider: DataProvider<TResources>,
): dataProvider is RealtimeDataProvider<TResources> {
  const candidate = dataProvider as Partial<RealtimeDataProvider<TResources>>;
  return (
    typeof candidate.subscribe === "function" &&
    typeof candidate.publish === "function"
  );
}

export function assertRealtimeDataProvider<
  TResources extends ResourceMap = ResourceMap,
>(
  dataProvider: DataProvider<TResources>,
  caller: string,
): asserts dataProvider is RealtimeDataProvider<TResources> {
  if (!isRealtimeDataProvider(dataProvider)) {
    throw new Error(
      `${caller}: dataProvider does not implement subscribe(). Wrap it with realtimeDataProvider().`,
    );
  }
}
