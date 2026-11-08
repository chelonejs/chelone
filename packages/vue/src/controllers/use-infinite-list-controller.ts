/**
 * `useInfiniteListController` — the Vue bridge for the vanilla core infinite
 * list controller, the twin of `@chelone/react`'s hook (`infinite-hooks.ts`)
 * and the sibling of `useListController`: one controller built at `setup`
 * (construction is INERT), attached by `useMicroStore` on mount and released on
 * scope disposal, behind a `reactive` facade of state and stable actions.
 *
 * Filters and sort live in the store only: the composable never reads or
 * writes the location.
 */

import {
  createInfiniteListController,
  type InfiniteListController,
  type InfiniteListControllerState,
  type ListControllerOptions,
  type LooseRecord,
  listControllerActions,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
} from "@chelone/core";
import { computed, reactive } from "vue";
import { useCheloneContext } from "../context";
import { useRequiredResource } from "../resource-context";
import { useMicroStore } from "../store/use-micro-store";
import { toControllerContext } from "./controller-context";

/** Options for {@link useInfiniteListController}: the core list options + a resource override. */
export interface UseInfiniteListControllerOptions<TRecord = LooseRecord>
  extends ListControllerOptions<TRecord> {
  /** Target a specific resource; defaults to the ambient `<Resource>` name. */
  resource?: string;
}

/** The reactive result: every field of the infinite state (live) plus the stable actions. */
export type UseInfiniteListControllerReturn<TRecord> =
  InfiniteListControllerState<TRecord> &
    Omit<
      InfiniteListController<TRecord>,
      keyof MicroStore<InfiniteListControllerState<TRecord>>
    >;

/**
 * Load a resource list page by page. `fetchNextPage` appends the next page to
 * `data`; any change to filter, sort, page or perPage drops the loaded pages
 * and starts over. The controller attaches on mount and releases on scope
 * disposal. `options` are read once at `setup`.
 */
export function useInfiniteListController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseInfiniteListControllerOptions<RecordOf<TResources, TName>> = {},
): UseInfiniteListControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const resource = useRequiredResource<TName>(
    "useInfiniteListController",
    options,
  );

  const controller: InfiniteListController<TRecord> =
    createInfiniteListController(toControllerContext(ctx), resource, options);
  const state = useMicroStore(controller);

  const facade: UseInfiniteListControllerReturn<TRecord> = reactive({
    data: computed(() => state.value.data),
    total: computed(() => state.value.total),
    pageInfo: computed(() => state.value.pageInfo),
    isPending: computed(() => state.value.isPending),
    isFetching: computed(() => state.value.isFetching),
    isFetchingNextPage: computed(() => state.value.isFetchingNextPage),
    isFetchingPreviousPage: computed(() => state.value.isFetchingPreviousPage),
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
    fetchNextPage: controller.fetchNextPage,
    fetchPreviousPage: controller.fetchPreviousPage,
  });
  return facade;
}
