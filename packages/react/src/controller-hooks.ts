import {
  createListController,
  type ListController,
  type ListControllerContext,
  type ListControllerOptions,
  type ListControllerState,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
} from "@chelone/core";
import { useMemo, useState, useSyncExternalStore } from "react";
import { type CheloneContextValue, useCheloneContext } from "./context";

/** Reactive controller state plus the controller's stable actions. */
export type UseListControllerResult<TRecord> = ListControllerState<TRecord> &
  Omit<ListController<TRecord>, keyof MicroStore<ListControllerState<TRecord>>>;

function toControllerContext<TResources extends ResourceMap>(
  ctx: CheloneContextValue<TResources>,
): ListControllerContext<TResources> {
  const { dataProvider, queryClient, store, notifications, i18n } = ctx;
  return {
    dataProvider,
    queryClient,
    store,
    notifications,
    translate: i18n ? (key) => i18n.translate(key) : undefined,
  };
}

/**
 * React bridge for the vanilla list controller.
 *
 * Binding pattern (Task 4R redesign):
 * - Controller construction is INERT (no subscriptions, no fetch), so the
 *   render-phase `useState` initializer is safe: a discarded render
 *   (Suspense sibling suspending, StrictMode double render, hidden
 *   `<Activity>` pre-render, a render that throws) leaves only garbage —
 *   never a live zombie. `ctx`/`resource`/`options` changes after mount are
 *   IGNORED by design — remount (e.g. with a `key`) to change them.
 * - `useSyncExternalStore`'s commit-phase subscribe performs the attach: the
 *   controller acquires its QueryObserver + KV subscriptions on the FIRST
 *   subscriber and releases them on the LAST unsubscribe. Unmount,
 *   StrictMode's simulated mount->cleanup->remount, and `<Activity>`
 *   hide/show all flow through this single detach/re-attach path — no
 *   recreate machinery, nothing leaks.
 * - There is deliberately NO `useEffect(() => () => controller.destroy())`:
 *   an effect-cleanup destroy is indistinguishable from an `<Activity>` hide
 *   (both are effect teardowns without unmount) and would permanently kill a
 *   controller that must survive to re-attach on reveal. Last-unsubscribe
 *   detach already releases every resource at unmount; `destroy()` stays the
 *   imperative teardown for vanilla (non-React) consumers.
 * - Actions are taken off the controller object, so their identities are
 *   stable across renders; the returned object is rebuilt per snapshot.
 */
export function useListController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options?: ListControllerOptions,
): UseListControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();

  const [controller] = useState<ListController<TRecord>>(() =>
    createListController(toControllerContext(ctx), resource, options),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
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
    }),
    [snapshot, controller],
  );
}
