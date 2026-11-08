import {
  createSavedQueriesController,
  type LooseRecord,
  type SavedQueriesControllerOptions,
  type SavedQuery,
  type SavedQueryValue,
} from "@chelone/core";
import { computed, type Ref } from "vue";
import { useCheloneContext } from "../context";
import { useMicroStore } from "./use-micro-store";

export interface UseSavedQueriesReturn<TRecord = LooseRecord> {
  queries: Readonly<Ref<readonly SavedQuery<TRecord>[]>>;
  /** Trims the label and ignores a blank one; a same-label query is replaced. */
  save(label: string, value: SavedQueryValue<TRecord>): void;
  /** Trims the label; a label no query has is ignored. */
  remove(label: string): void;
}

/**
 * The named list queries of `resource`, persisted in the KV store. Several
 * instances over one store key stay in step. Without a store the queries live
 * in this instance only. The resource and options are read
 * once, in `setup`.
 *
 * Divergence from ra-core's `useSavedQueries`, which returns a
 * `[queries, setQueries]` tuple: this returns `{ queries, save, remove }`, with
 * `queries` a ref.
 */
export function useSavedQueries<TRecord = LooseRecord>(
  resource: string,
  options: SavedQueriesControllerOptions = {},
): UseSavedQueriesReturn<TRecord> {
  const controller = createSavedQueriesController<TRecord>(
    { store: useCheloneContext().store },
    resource,
    options,
  );
  const state = useMicroStore(controller);
  return {
    queries: computed(() => state.value.queries),
    save: controller.save,
    remove: controller.remove,
  };
}
