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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
 * Binding pattern (charter P4 gate):
 * - The controller is created ONCE per mount. `ctx`/`resource`/`options`
 *   changes after mount are IGNORED by design — remount (e.g. with a `key`)
 *   to change them. Creation uses the ref-lazy-init pattern instead of a
 *   useState initializer: StrictMode double-invokes useState initializers and
 *   would leak the discarded controller's already-subscribed QueryObserver,
 *   while a ref lazy-init runs exactly once per mount.
 * - Subscription goes through useSyncExternalStore against the micro-store
 *   (same-reference snapshots until setState — no tearing, no per-read churn).
 * - The effect cleanup destroys the controller. Under <StrictMode>'s
 *   mount->unmount->remount cycle the first controller is destroyed for good
 *   (micro-stores do not resurrect); the effect detects that and creates a
 *   fresh controller for the second mount — two controllers total, first
 *   destroyed, none leaked.
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

  // Pin the mount-time creation arguments (options after mount are ignored).
  const create = () =>
    createListController(toControllerContext(ctx), resource, options);
  const createRef = useRef(create);

  // Ref-lazy-init: exactly one controller per mount, even under StrictMode's
  // double render (the docs-blessed `if (ref.current === null)` exception).
  const controllerRef = useRef<ListController<TRecord> | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createRef.current();
  }
  const [controller, setController] = useState(controllerRef.current);
  const destroyedByCleanup = useRef(false);

  useEffect(() => {
    if (destroyedByCleanup.current) {
      // StrictMode mount->unmount->remount: the cleanup below destroyed the
      // controller during the simulated unmount. Recreate for the real mount.
      destroyedByCleanup.current = false;
      const next = createRef.current();
      controllerRef.current = next;
      setController(next);
      return;
    }
    return () => {
      destroyedByCleanup.current = true;
      controller.destroy();
    };
  }, [controller]);

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
