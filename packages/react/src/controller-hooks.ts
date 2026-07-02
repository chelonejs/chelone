import {
  type CreateController,
  type CreateControllerOptions,
  type CreateControllerState,
  createCreateController,
  createDeleteController,
  createEditController,
  createListController,
  createShowController,
  type DeleteController,
  type DeleteControllerOptions,
  type DeleteControllerState,
  type EditController,
  type EditControllerOptions,
  type EditControllerState,
  type ListController,
  type ListControllerContext,
  type ListControllerOptions,
  type ListControllerState,
  type MicroStore,
  type RecordControllerContext,
  type RecordOf,
  type ResourceMap,
  type ShowControllerOptions,
  type ShowControllerState,
} from "@chelone/core";
import { useMemo, useState, useSyncExternalStore } from "react";
import { type CheloneContextValue, useCheloneContext } from "./context";

/** Reactive controller state plus the controller's stable actions. */
export type UseListControllerResult<TRecord> = ListControllerState<TRecord> &
  Omit<ListController<TRecord>, keyof MicroStore<ListControllerState<TRecord>>>;

/** Structurally one context: both controller families need the same services. */
function toControllerContext<TResources extends ResourceMap>(
  ctx: CheloneContextValue<TResources>,
): ListControllerContext<TResources> & RecordControllerContext<TResources> {
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

// The four record bridges below follow the useListController binding pattern
// EXACTLY (see its doc block): inert construction in a render-phase useState
// (discarded renders leave garbage, never zombies), attach on
// useSyncExternalStore's first commit-phase subscribe, release on last
// unsubscribe (unmount, StrictMode remount, <Activity> hide/show), deliberately
// NO destroy effect and NO recreate machinery. `ctx`/`resource`/`options`
// changes after mount are IGNORED — remount with a `key` to change them.

/** Reactive edit state plus the controller's stable `save`. */
export type UseEditControllerResult<TRecord> = EditControllerState<TRecord> &
  Omit<EditController<TRecord>, keyof MicroStore<EditControllerState<TRecord>>>;

/** React bridge for the vanilla edit controller. */
export function useEditController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options: EditControllerOptions<RecordOf<TResources, TName>>,
): UseEditControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();

  const [controller] = useState<EditController<TRecord>>(() =>
    createEditController(toControllerContext(ctx), resource, options),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({ ...snapshot, save: controller.save }),
    [snapshot, controller],
  );
}

/**
 * React bridge for the vanilla show controller. The show controller is pure
 * state (no actions), so the micro-store snapshot IS the result — stable by
 * the snapshot-stability guarantee (same reference until setState).
 */
export function useShowController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options: ShowControllerOptions,
): ShowControllerState<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();

  const [controller] = useState<MicroStore<ShowControllerState<TRecord>>>(() =>
    createShowController(toControllerContext(ctx), resource, options),
  );

  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
}

/** Reactive create state plus the controller's stable `save`. */
export type UseCreateControllerResult<TRecord> =
  CreateControllerState<TRecord> &
    Omit<
      CreateController<TRecord>,
      keyof MicroStore<CreateControllerState<TRecord>>
    >;

/** React bridge for the vanilla create controller. */
export function useCreateController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options?: CreateControllerOptions<RecordOf<TResources, TName>>,
): UseCreateControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();

  const [controller] = useState<CreateController<TRecord>>(() =>
    createCreateController(toControllerContext(ctx), resource, options),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({ ...snapshot, save: controller.save }),
    [snapshot, controller],
  );
}

/** Reactive delete state plus the controller's stable `deleteOne`. */
export type UseDeleteControllerResult<TRecord> = DeleteControllerState &
  Omit<DeleteController<TRecord>, keyof MicroStore<DeleteControllerState>>;

/** React bridge for the vanilla delete controller. */
export function useDeleteController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options?: DeleteControllerOptions,
): UseDeleteControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();

  const [controller] = useState<DeleteController<TRecord>>(() =>
    createDeleteController(toControllerContext(ctx), resource, options),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({ ...snapshot, deleteOne: controller.deleteOne }),
    [snapshot, controller],
  );
}
