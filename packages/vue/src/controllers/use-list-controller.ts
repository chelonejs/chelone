/**
 * `useListController` — the Vue bridge for the vanilla core list controller, the
 * twin of `@chelone/react`'s `useListController` (`controller-hooks.ts`). It
 * wraps `createListController` (unchanged core) through the Task-2 `useMicroStore`
 * reactivity bridge and returns a `reactive` view of controller state plus the
 * controller's stable actions.
 *
 * How the fetch is driven (the "vue-query wiring"): the controller itself owns a
 * `QueryObserver` over `ctx.queryClient` — the SAME vanilla `query-core`
 * observer the React adapter's controllers use. `<Admin>` creates the
 * `@tanstack/vue-query` `QueryClient` and provides it on the Chelone context;
 * `toControllerContext` hands it to `createListController`, whose observer reads
 * and writes that client's cache. So there is no `useQuery` hook in the seam —
 * the controller drives the query, and `useMicroStore` is the single subscribe seam
 * that turns the controller's `MicroStore` snapshots into Vue reactivity (the
 * 4R acquire fires on the first `store.subscribe`, release on scope disposal).
 *
 * Binding pattern (mirrors the React twin): the controller is constructed ONCE
 * at `setup` (construction is INERT — no subscriptions, no fetch until the first
 * subscriber), and `useMicroStore` attaches on mount / releases on unmount. `ctx` /
 * `resource` / `options` are read once at `setup`; to target a different
 * resource, mount a fresh instance (the Vue analog of React's remount-with-key).
 */

import {
  createListController,
  type ListController,
  type ListControllerOptions,
  type ListControllerSurface,
  type LooseRecord,
  listControllerActions,
  listPatchFromSearch,
  type RecordOf,
  type ResourceMap,
  serializeListState,
} from "@chelone/core";
import { computed, onScopeDispose, reactive, watch } from "vue";
import { useCheloneContext } from "../context";
import { useRequiredResource } from "../resource-context";
import { useRouterAdapterOptional } from "../router/adapter";
import { useMicroStore } from "../store/use-micro-store";
import { toControllerContext } from "./controller-context";

/** Options for {@link useListController}: the core list options + a resource override. */
export interface UseListControllerOptions<TRecord = LooseRecord>
  extends ListControllerOptions<TRecord> {
  /** Target a specific resource; defaults to the ambient `<Resource>` name. */
  resource?: string;
  /**
   * Sync list params (filter / sort / page / perPage / displayedFilters) to the
   * URL query string, ra-core `useListParams`-style: the initial params are
   * SEEDED from the location on mount (deep-linkable), re-seeded when the
   * location changes later (back/forward, a followed link), and every param
   * change is PUSHED back with `replace: true`. Default `true` for a top-level resource
   * list. Set `false` for an embedded / reference list (mirrors ra-core's
   * `disableSyncWithLocation`) to keep the pure store/KV behavior.
   *
   * Effective only when a `RouterAdapter` is present above the composable;
   * without one (standalone / many unit tests) the sync degrades to a no-op and
   * the store/KV behavior is used regardless of this flag.
   */
  syncWithLocation?: boolean;
}

/**
 * The reactive result: every field of `ListControllerState` (unwrapped, live)
 * plus the controller's stable actions (`setPage`/`setSort`/`toggleItem`/…). The
 * same shape the React twin returns, minus the `MicroStore` plumbing.
 */
export type UseListControllerReturn<TRecord> = ListControllerSurface<TRecord>;

export function useListController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseListControllerOptions<RecordOf<TResources, TName>> = {},
): UseListControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const resource = useRequiredResource<TName>("useListController", options);

  // URL-sync is enabled for a top-level list (default on) AND only when a
  // RouterAdapter is present. Vue has no Rules of Hooks, so the adapter readers
  // can be called conditionally (unlike the React twin, which must suppress
  // `useHookAtTopLevel` and lean on mount-stable adapter presence).
  const adapter = useRouterAdapterOptional();
  const syncEnabled = (options.syncWithLocation ?? true) && adapter != null;
  const location = syncEnabled && adapter ? adapter.useLocation() : null;
  const navigate = syncEnabled && adapter ? adapter.useNavigate() : null;

  const controller: ListController<TRecord> = createListController(
    toControllerContext(ctx),
    resource,
    options,
  );

  // Deep-link seed (URL -> state): apply BEFORE `useMicroStore` subscribes (the first
  // subscriber triggers the fetch), and only when the URL carries custom params,
  // so a clean URL falls back to the option/KV defaults (ra-core semantics).
  const seed = location
    ? listPatchFromSearch<TRecord>(location.value.search)
    : null;
  if (seed) controller.setParams(seed);

  // The single subscribe seam: mounts the controller's observer (4R acquire),
  // releases it on scope disposal (4R release). `state` is a read-only ref that
  // swaps whole snapshots on every controller mutation.
  const state = useMicroStore(controller);

  // Push param changes -> URL. Seed `lastPushed` from the CURRENT (post-seed)
  // state so the mount itself never pushes — a clean URL stays clean until the user changes a param, then the
  // full query is written (`replace`, ra-core `useListParams`-style). The
  // controller notifies on EVERY change (incl. data/isPending); the search-diff
  // guard makes non-param changes a no-op and naturally covers the DEBOUNCED
  // `setFilters` path (the URL updates when the debounced state settles). The
  // live `pathname` is read from the reactive `location` on each push.
  if (navigate && location) {
    let lastPushed = serializeListState(controller.getSnapshot());
    const unsubscribe = controller.subscribe(() => {
      const search = serializeListState(controller.getSnapshot());
      if (search === lastPushed) return;
      lastPushed = search;
      navigate(`${location.value.pathname}${search}`, { replace: true });
    });
    onScopeDispose(unsubscribe);

    // URL -> state after mount: back/forward or a followed link re-seeds the
    // params. Our own push comes back as `lastPushed` and is skipped.
    watch(
      () => location.value.search,
      (search) => {
        if (search === lastPushed) return;
        const patch = listPatchFromSearch<TRecord>(search);
        if (patch) controller.setParams(patch);
      },
    );
  }

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
    ...listControllerActions(controller),
    defaultPerPage: controller.defaultPerPage,
  }) as UseListControllerReturn<TRecord>;
}
