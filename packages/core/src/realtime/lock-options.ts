import { lockKey, locksKey } from "../data/keys";
import type { DataContext } from "../data/query-options";
import type { ResourceMap } from "../resource/registry";
import { assertRealtimeDataProvider } from "./realtime-data-provider";
import type { GetLockParams, Lock } from "./types";

/** One record's lock, cached under `lockKey`. Resolves to `null` when unlocked. */
export function getLockOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName, params: GetLockParams) {
  const { dataProvider } = ctx;
  assertRealtimeDataProvider(dataProvider, "getLockOptions");
  return {
    queryKey: lockKey(resource, params),
    queryFn: (): Promise<Lock | null> => dataProvider.getLock(resource, params),
  };
}

/** Every lock held on a resource, cached under `locksKey`. */
export function getLocksOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName) {
  const { dataProvider } = ctx;
  assertRealtimeDataProvider(dataProvider, "getLocksOptions");
  return {
    queryKey: locksKey(resource),
    queryFn: (): Promise<Lock[]> => dataProvider.getLocks(resource),
  };
}
