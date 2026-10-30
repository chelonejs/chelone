import {
  createSavedQueriesController,
  type SavedQueriesControllerOptions,
  type SavedQuery,
  type SavedQueryValue,
} from "@chelone/core";
import { computed, type Ref } from "vue";
import { useChelonStore } from "../context";
import { useStore } from "./use-store";

export interface UseSavedQueriesReturn {
  queries: Readonly<Ref<SavedQuery[]>>;
  /** Trims the label and ignores a blank one; a same-label query is replaced. */
  save(label: string, value: SavedQueryValue): void;
  remove(label: string): void;
}

/**
 * The named list queries of `resource`, persisted in the KV store. Several
 * instances over one store key stay in step. The resource and options are read
 * once, in `setup`.
 *
 * Divergence from ra-core's `useSavedQueries`, which returns a
 * `[queries, setQueries]` tuple: this returns `{ queries, save, remove }`, with
 * `queries` a ref.
 */
export function useSavedQueries(
  resource: string,
  options: SavedQueriesControllerOptions = {},
): UseSavedQueriesReturn {
  const controller = createSavedQueriesController(
    { store: useChelonStore() },
    resource,
    options,
  );
  const state = useStore(controller);
  return {
    queries: computed(() => state.value.queries),
    save: controller.save,
    remove: controller.remove,
  };
}
