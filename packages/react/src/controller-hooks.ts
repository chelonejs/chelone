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
  type ListControllerSurface,
  type LooseRecord,
  listControllerActions,
  listPatchFromSearch,
  type MicroStore,
  type RecordControllerContext,
  type RecordOf,
  type ResourceMap,
  type ResourceRecord,
  type ShowControllerOptions,
  type ShowControllerState,
  serializeListState,
} from "@chelone/core";
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { type CheloneContextValue, useCheloneContext } from "./context";
import { RouterAdapterContext } from "./router/adapter";

/** Reactive controller state plus the controller's stable actions. */
export type UseListControllerResult<TRecord> = ListControllerSurface<TRecord>;

/**
 * Options for {@link useListController} — the vanilla {@link ListControllerOptions}
 * plus the React-only `syncWithLocation` URL-sync switch.
 */
export interface UseListControllerOptions<TRecord = LooseRecord>
  extends ListControllerOptions<TRecord> {
  /**
   * Sync list params (filter / sort / page / perPage / displayedFilters) to the
   * URL query string, ra-core `useListParams`-style: the initial params are
   * SEEDED from the location on mount (deep-linkable), re-seeded when the
   * location changes later (back/forward, a followed link), and every param
   * change is PUSHED back with `replace: true`. Default `true` for a top-level resource
   * list. Set `false` for an embedded / reference list (mirrors ra-core's
   * `disableSyncWithLocation`) to keep the pure store/KV behavior.
   *
   * Effective only when a `RouterAdapter` is present above the hook; without one
   * (standalone / many unit tests) the sync degrades to a no-op and the store/KV
   * behavior is used regardless of this flag.
   */
  syncWithLocation?: boolean;
}

/** Structurally one context: both controller families need the same services. */
export function toControllerContext<TResources extends ResourceMap>(
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
  options?: UseListControllerOptions<RecordOf<TResources, TName>>,
): UseListControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();

  // URL-sync is enabled only for a top-level list (default on) AND only when a
  // RouterAdapter is present. Both conditions are MOUNT-STABLE (adapter presence
  // can only change across a full remount of this subtree — same guarantee
  // `useRedirectOptional` relies on; options are frozen at mount by design), so
  // the conditional adapter-hook calls below preserve hook order every render.
  const adapter = useContext(RouterAdapterContext);
  const [syncEnabled] = useState(
    () => (options?.syncWithLocation ?? true) && adapter != null,
  );

  // biome-ignore lint/correctness/useHookAtTopLevel: syncEnabled + adapter presence are mount-stable — see the doc block above and useRedirectOptional.
  const location = syncEnabled && adapter ? adapter.useLocation() : null;
  // biome-ignore lint/correctness/useHookAtTopLevel: same mount-stability as `location`.
  const navigate = syncEnabled && adapter ? adapter.useNavigate() : null;

  // Deep-link seed: the URL search goes into the controller AT CONSTRUCTION,
  // the same `search` a route loader hands to `listFetchParams`, so the first
  // fetch, the first snapshot and the loader's prefetch are one query key. A
  // clean URL keeps the option/KV defaults (ra-core semantics).
  const [controller] = useState<ListController<TRecord>>(() =>
    createListController(
      toControllerContext(ctx),
      resource,
      options,
      syncEnabled && location ? location.search : "",
    ),
  );

  // Push param changes -> URL. Read the live pathname through a ref so a router
  // that re-renders us with a new pathname pushes to the right place without
  // re-subscribing. `lastPushedRef` is the search the state was last synced
  // with, so the location effect below can tell our own push from a navigation.
  const pathname = location?.pathname;
  const pathnameRef = useRef<string>(pathname ?? "");
  useEffect(() => {
    if (pathname !== undefined) pathnameRef.current = pathname;
  }, [pathname]);
  const lastPushedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!syncEnabled || !navigate) return;
    // Initialize to the CURRENT (seeded) state's search so the mount itself
    // never pushes — a clean URL stays clean until the user actually changes a
    // param (then the full query is written, ra-core `useListParams`-style).
    if (lastPushedRef.current === null) {
      lastPushedRef.current = serializeListState(controller.getSnapshot());
    }
    const pushToUrl = (): void => {
      const search = serializeListState(controller.getSnapshot());
      if (search === lastPushedRef.current) return;
      lastPushedRef.current = search;
      navigate(`${pathnameRef.current}${search}`, { replace: true });
    };
    // The controller notifies on EVERY state change (incl. data/isPending); the
    // search-diff guard makes non-param changes a no-op, so only real param
    // moves navigate. This second subscriber also naturally covers the DEBOUNCED
    // `setFilters` path (the URL updates when the debounced state settles).
    return controller.subscribe(pushToUrl);
  }, [syncEnabled, navigate, controller]);

  // URL -> state after mount: back/forward or a followed link re-seeds the params.
  const search = location?.search;
  const seenSearchRef = useRef(search);
  useEffect(() => {
    if (search === undefined || search === seenSearchRef.current) return;
    seenSearchRef.current = search;
    if (search === lastPushedRef.current) return;
    const patch = listPatchFromSearch<TRecord>(search);
    if (patch) controller.setParams(patch);
  }, [search, controller]);

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      ...listControllerActions(controller),
      defaultPerPage: controller.defaultPerPage,
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

/** Naming alias so all five bridges expose a UseXControllerResult type. */
export type UseShowControllerResult<
  TRecord extends ResourceRecord = LooseRecord,
> = ShowControllerState<TRecord>;

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
