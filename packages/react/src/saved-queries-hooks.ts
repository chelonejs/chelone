import {
  createSavedQueriesController,
  type LooseRecord,
  type SavedQueriesControllerOptions,
  type SavedQuery,
  type SavedQueryValue,
} from "@chelone/core";
import { useMemo, useSyncExternalStore } from "react";
import { useCheloneContext } from "./context";

export interface UseSavedQueriesResult<TRecord = LooseRecord> {
  queries: readonly SavedQuery<TRecord>[];
  /** Trims the label and ignores a blank one; a same-label query is replaced. */
  save(label: string, value: SavedQueryValue<TRecord>): void;
  /** Trims the label; a label no query has is ignored. */
  remove(label: string): void;
}

/**
 * The named list queries of `resource`, persisted in the KV store. Several
 * instances over one store key stay in step. Without a store the queries live
 * in this hook instance only.
 *
 * Divergence from ra-core's `useSavedQueries`, which returns a
 * `[queries, setQueries]` tuple: this returns `{ queries, save, remove }`.
 */
export function useSavedQueries<TRecord = LooseRecord>(
  resource: string,
  options: SavedQueriesControllerOptions = {},
): UseSavedQueriesResult<TRecord> {
  const { store } = useCheloneContext();
  const { storeKey } = options;
  // Construction is inert (nothing attaches until the first subscribe), so a
  // memo that React discards leaks nothing.
  const controller = useMemo(
    () =>
      createSavedQueriesController<TRecord>({ store }, resource, { storeKey }),
    [store, resource, storeKey],
  );
  const { queries } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return { queries, save: controller.save, remove: controller.remove };
}
