/**
 * `useListController` — the Vue bridge for the vanilla core list controller, the
 * twin of `@chelone/react`'s `useListController` (`controller-hooks.ts`). It
 * wraps `createListController` (unchanged core) through the Task-2 `useStore`
 * reactivity bridge and returns a `reactive` view of controller state plus the
 * controller's stable actions.
 *
 * How the fetch is driven (the "vue-query wiring"): the controller itself owns a
 * `QueryObserver` over `ctx.queryClient` — the SAME vanilla `query-core`
 * observer the React adapter's controllers use. `<Admin>` creates the
 * `@tanstack/vue-query` `QueryClient` and provides it on the Chelone context;
 * `toControllerContext` hands it to `createListController`, whose observer reads
 * and writes that client's cache. So there is no `useQuery` hook in the seam —
 * the controller drives the query, and `useStore` is the single subscribe seam
 * that turns the controller's `MicroStore` snapshots into Vue reactivity (the
 * 4R acquire fires on the first `store.subscribe`, release on scope disposal).
 *
 * Binding pattern (mirrors the React twin): the controller is constructed ONCE
 * at `setup` (construction is INERT — no subscriptions, no fetch until the first
 * subscriber), and `useStore` attaches on mount / releases on unmount. `ctx` /
 * `resource` / `options` are read once at `setup`; to target a different
 * resource, mount a fresh instance (the Vue analog of React's remount-with-key).
 */

import {
  createListController,
  type ListController,
  type ListControllerOptions,
  type ListControllerState,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
} from "@chelone/core";
import { computed, reactive } from "vue";
import { useCheloneContext } from "../context";
import { useRequiredResource } from "../resource-context";
import { useStore } from "../store/use-store";
import { toControllerContext } from "./controller-context";

/** Options for {@link useListController}: the core list options + a resource override. */
export interface UseListControllerOptions extends ListControllerOptions {
  /** Target a specific resource; defaults to the ambient `<Resource>` name. */
  resource?: string;
}

/**
 * The reactive result: every field of `ListControllerState` (unwrapped, live)
 * plus the controller's stable actions (`setPage`/`setSort`/`toggleItem`/…). The
 * same shape the React twin returns, minus the `MicroStore` plumbing.
 */
export type UseListControllerReturn<TRecord> = ListControllerState<TRecord> &
  Omit<ListController<TRecord>, keyof MicroStore<ListControllerState<TRecord>>>;

export function useListController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseListControllerOptions = {},
): UseListControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const resource = useRequiredResource("useListController", options) as TName;

  const controller: ListController<TRecord> = createListController(
    toControllerContext(ctx),
    resource,
    options,
  );

  // The single subscribe seam: mounts the controller's observer (4R acquire),
  // releases it on scope disposal (4R release). `state` is a read-only ref that
  // swaps whole snapshots on every controller mutation.
  const state = useStore(controller);

  // A `reactive` facade: state fields as live computed getters (unwrapped on
  // access — records stay raw, never deep-proxied) + the stable action closures.
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
    setPage: controller.setPage,
    setPerPage: controller.setPerPage,
    setSort: controller.setSort,
    setFilters: controller.setFilters,
    showFilter: controller.showFilter,
    hideFilter: controller.hideFilter,
    select: controller.select,
    toggleItem: controller.toggleItem,
    unselectAll: controller.unselectAll,
    selectAll: controller.selectAll,
    refetch: controller.refetch,
  }) as UseListControllerReturn<TRecord>;
}
