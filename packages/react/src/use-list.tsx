import {
  type ClientListController,
  type ClientListControllerOptions,
  createClientListController,
  type FilterPayload,
  type ResourceRecord,
} from "@chelone/core";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { UseListControllerResult } from "./controller-hooks";

/** Options accepted by {@link useList} — the client-side (in-memory) list hook. */
export interface UseListOptions<TRecord extends ResourceRecord = ResourceRecord>
  extends ClientListControllerOptions<TRecord> {}

/** What {@link useList} returns — the SAME shape as `useListController`. */
export type UseListResult<TRecord extends ResourceRecord = ResourceRecord> =
  UseListControllerResult<TRecord>;

const EMPTY_FILTER: FilterPayload = {};

/**
 * Client-side list hook: filters, sorts, paginates, and tracks selection over
 * an in-memory `data` array — NO dataProvider, no fetching. Returns the same
 * `UseListControllerResult` shape a `<ListContextProvider>` / `useListContext`
 * consumer reads, so it is a drop-in source for a `<ListContextProvider>`
 * around inline choices, arrays of embedded records, or any list rendered from
 * data already in memory. Matches ra-core's `useList`.
 *
 * Binding pattern mirrors `useListController`: the controller is constructed
 * INERT in a render-phase `useState` (a discarded render leaves only garbage),
 * bound via `useSyncExternalStore`, and its stable actions are lifted onto the
 * returned object. `data` and `filter` PROP changes are reflected into the
 * live controller via effects (keyed by value, not reference) — unlike the
 * server controller, whose ctx/resource/options are frozen at mount.
 */
export function useList<TRecord extends ResourceRecord = ResourceRecord>(
  options: UseListOptions<TRecord>,
): UseListResult<TRecord> {
  const { data, filter, isPending, isFetching, error } = options;

  const [controller] = useState<ClientListController<TRecord>>(() =>
    createClientListController(options),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  // Latest-props refs: the reflection effects read the CURRENT prop through a
  // stable ref (never a stale closure) while depending only on the content KEY
  // — so a fresh array/object with identical contents cannot thrash the derived
  // slice (ra-core `JSON.stringify(data)` parity). Same idiom as FilterLiveForm.
  const dataRef = useRef(data);
  dataRef.current = data;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // Reflect external `data` prop changes. The KEY is genuinely consumed inside
  // (the reflected-key guard) so the effect runs only on a real content change;
  // the mount reflect is skipped because construction already seeded the data.
  const dataKey = useMemo(() => JSON.stringify(data ?? null), [data]);
  const lastReflectedDataKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastReflectedDataKey.current === null) {
      lastReflectedDataKey.current = dataKey; // seeded at construction.
      return;
    }
    if (lastReflectedDataKey.current === dataKey) return;
    lastReflectedDataKey.current = dataKey;
    controller.setData(dataRef.current);
  }, [dataKey, controller]);

  // Reflect external `filter` prop changes (same key-guard idiom).
  const filterKey = useMemo(
    () => JSON.stringify(filter ?? EMPTY_FILTER),
    [filter],
  );
  const lastReflectedFilterKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastReflectedFilterKey.current === null) {
      lastReflectedFilterKey.current = filterKey; // seeded at construction.
      return;
    }
    if (lastReflectedFilterKey.current === filterKey) return;
    lastReflectedFilterKey.current = filterKey;
    controller.setSourceFilter(filterRef.current ?? {});
  }, [filterKey, controller]);

  // Reflect external LOADING-FLAG prop changes (async source feeding the list).
  // Declared AFTER the data effect so that on a render where both `data` and
  // `isPending` change (source resolves), `setData` lands first (recompute
  // still blanks while pending) and the `isPending: false` recompute here then
  // populates the derived slice. `setLoadingState` diffs internally, so a plain
  // scalar dep list is safe — no key stringify needed. Skips the mount seed.
  const loadingReflected = useRef(false);
  useEffect(() => {
    if (!loadingReflected.current) {
      loadingReflected.current = true; // seeded at construction.
      return;
    }
    controller.setLoadingState({ isPending, isFetching, error });
  }, [isPending, isFetching, error, controller]);

  return useMemo(
    () => ({
      ...snapshot,
      setPage: controller.setPage,
      setPerPage: controller.setPerPage,
      setSort: controller.setSort,
      setFilters: controller.setFilters,
      setParams: controller.setParams,
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
