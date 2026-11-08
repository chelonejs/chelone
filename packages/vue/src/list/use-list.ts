/**
 * `useList` — the client-side (in-memory) list composable, the Vue twin of
 * `@chelone/react`'s `useList` (`use-list.tsx`). It filters / sorts / paginates
 * / selects over an in-memory `data` array with NO dataProvider and NO fetching,
 * returning the SAME reactive shape a `<List>` publishes (`ListContextValue`) —
 * so it is a drop-in source for `provideListContext` around an array of embedded
 * records (`<ArrayField>`) or an async-resolved reference list
 * (`<ReferenceArrayField>` / `<ReferenceManyField>`).
 *
 * Idiom translation from the React twin: React binds the vanilla
 * `createClientListController` with `useSyncExternalStore` and reflects `data` /
 * `filter` / loading PROP changes back into the controller through effects
 * (keyed by content, guarded against the mount seed). Vue binds it through the
 * same {@link useMicroStore} seam and reflects reactive-source changes with `watch`
 * (skip-on-mount by default — construction already seeded the source). The data
 * watcher is registered BEFORE the loading watcher so that on the tick an async
 * source resolves (`data` populates AND `isPending` flips false together),
 * `setData` lands first and the `setLoadingState` recompute then publishes the
 * populated slice — exactly the React effect ordering.
 */

import {
  type ClientListController,
  type ClientListLoadingState,
  createClientListController,
  type FilterPayload,
  listControllerActions,
  type ResourceRecord,
  type SortPayload,
} from "@chelone/core";
import { computed, type MaybeRefOrGetter, reactive, toValue, watch } from "vue";
import { useMicroStore } from "../store/use-micro-store";
import type { ListContextValue } from "./list-context";

/** Options for {@link useList} — the client-side list composable. */
export interface UseListOptions<
  TRecord extends ResourceRecord = ResourceRecord,
> {
  /** The in-memory records (reactive-aware). `undefined` = not-yet-loaded. */
  data?: MaybeRefOrGetter<TRecord[] | undefined>;
  /** Client-side filter for the embedded list. */
  filter?: FilterPayload<TRecord>;
  /** Client-side sort for the embedded list. */
  sort?: SortPayload | SortPayload[];
  /** Client-side page size. Default 1000 (ra-core `useList` — "show everything"). */
  perPage?: number;
  /** Initial page (1-based). Default 1. */
  page?: number;
  /** Pass-through loading flag for an async source feeding the list. */
  isPending?: MaybeRefOrGetter<boolean>;
  /** Pass-through fetching flag for an async source feeding the list. */
  isFetching?: MaybeRefOrGetter<boolean>;
  /** Pass-through error for an async source feeding the list. */
  error?: MaybeRefOrGetter<Error | null>;
}

/**
 * Client-side list controller bound to Vue reactivity: returns the reactive
 * `ListContextValue` a `provideListContext` / `useListContext` consumer reads.
 * A reactive `data` / `isPending` / `isFetching` / `error` source is reflected
 * into the live controller so an async feed (a resolving `useGetMany` /
 * `useGetList`) populates the list in place.
 */
export function useList<TRecord extends ResourceRecord = ResourceRecord>(
  options: UseListOptions<TRecord> = {},
): ListContextValue<TRecord> {
  const controller: ClientListController<TRecord> =
    createClientListController<TRecord>({
      data: toValue(options.data),
      filter: options.filter,
      sort: options.sort,
      perPage: options.perPage,
      page: options.page,
      isPending: toValue(options.isPending),
      isFetching: toValue(options.isFetching),
      error: toValue(options.error),
    });

  // The single subscribe seam (4R acquire on first subscribe, release on scope
  // disposal). `state` swaps whole snapshots on every controller mutation.
  const state = useMicroStore(controller);

  // Reflect external `data` changes FIRST (registered before the loading watch)
  // so a resolving source sets the data before the loading recompute publishes.
  watch(
    () => toValue(options.data),
    (next) => controller.setData(next),
  );

  // Reflect external loading-flag changes (async source feeding the list).
  watch(
    () =>
      ({
        isPending: toValue(options.isPending),
        isFetching: toValue(options.isFetching),
        error: toValue(options.error),
      }) satisfies ClientListLoadingState,
    (patch) => controller.setLoadingState(patch),
  );

  // A `reactive` facade: state fields as live computed getters + stable actions
  // — the same shape `useListController` returns, so it satisfies the context.
  return reactive({
    data: computed(() => state.value.data),
    total: computed(() => state.value.total),
    pageInfo: computed(() => state.value.pageInfo),
    isPending: computed(() => state.value.isPending),
    isFetching: computed(() => state.value.isFetching),
    error: computed(() => state.value.error),
    page: computed(() => state.value.page),
    perPage: computed(() => state.value.perPage),
    sort: computed(() => state.value.sort),
    filter: computed(() => state.value.filter),
    displayedFilters: computed(() => state.value.displayedFilters),
    selectedIds: computed(() => state.value.selectedIds),
    hasNextPage: computed(() => state.value.hasNextPage),
    hasPreviousPage: computed(() => state.value.hasPreviousPage),
    ...listControllerActions(controller),
  }) as ListContextValue<TRecord>;
}
