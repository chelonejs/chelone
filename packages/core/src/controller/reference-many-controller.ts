import { QueryObserver, type QueryObserverResult } from "@tanstack/query-core";
import { getManyReferenceOptions } from "../data/query-options";
import type {
  FilterPayload,
  GetManyReferenceResult,
  SortPayload,
} from "../data/types";
import type { Identifier } from "../resource/identifier";
import type { LooseRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type { SourceKey } from "../resource/source-path";
import { createMicroStore } from "../store/micro-store";
import {
  createErrorAnnouncer,
  createListController,
  DEFAULT_DEBOUNCE_MS,
  type ListController,
  type ListControllerContext,
  type ListControllerState,
  type ListParamsPatch,
  pageFlags,
  resetPageTarget,
  runSelectAll,
} from "./list-controller";

export interface ReferenceManyControllerOptions<TRecord = LooseRecord> {
  /** The field on the referenced-FROM resource that holds the foreign key. A key of the referenced record. */
  target: SourceKey<TRecord>;
  /** The value `target` must equal. Null or undefined fetches nothing. */
  id: Identifier | null | undefined;
  /** Permanent filter, merged OVER the user filter for every fetch. */
  filter?: FilterPayload<TRecord>;
  /** Seed for the user filter when nothing is persisted. */
  filterDefaultValues?: FilterPayload<TRecord>;
  /** Initial sort when nothing is persisted: one payload or several, applied in order. Default id ascending. */
  sort?: SortPayload<TRecord> | SortPayload<TRecord>[];
  /** Default 25. */
  perPage?: number;
  /** Debounce delay for `setFilters(..., debounced=true)`. Default 500ms. */
  debounceMs?: number;
  /**
   * KV namespace for params/selection persistence. Default
   * `${reference}.${target}.${id}`, so two records keep separate pages and
   * selections; in memory when `id` is null or undefined. `false` keeps both
   * in memory.
   */
  storeKey?: string | false;
  /** Gates the data fetch only. Params and selection work either way. A disabled query with no cached data reads `isPending: true`. Default true. */
  enabled?: boolean;
}

/** Same state and actions as {@link ListController}, so it drops into a list context. */
export type ReferenceManyController<TRecord> = ListController<TRecord>;

/** The `perPage` a reference list starts at when nothing is persisted. The single definition: the choices controller and Vue's `<ReferenceInput>` read this. */
export const DEFAULT_REFERENCE_PER_PAGE = 25;

/**
 * A server-paged list of the rows whose `target` equals `id`, read through
 * `getManyReference`. Params and selection live in an inner list controller
 * (which never fetches); this controller owns the data observer.
 *
 * Lifecycle (Task 4R) is the list controller's: construction is inert, the
 * first subscriber acquires the inner controller and the observer, the last
 * unsubscribe releases both. `observer.setOptions` runs only when the inner
 * params change, never from the result subscription; out-of-range page
 * resets go through the inner `setPage` and only on SETTLED results.
 */
export function createReferenceManyController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: ListControllerContext<TResources>,
  reference: TName,
  options: ReferenceManyControllerOptions<RecordOf<TResources, TName>>,
): ReferenceManyController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type ReferenceResult = GetManyReferenceResult<TRecord>;

  const { target, id } = options;
  /** The value `target` must equal; undefined means "nothing to fetch". */
  const targetValue = id ?? undefined;
  const storeKey =
    options.storeKey ??
    (targetValue === undefined
      ? false
      : `${reference}.${target}.${targetValue}`);

  // The inner controller still observes the `getList` entry that matches its
  // params, so it gets no notifications: a cached `getList` failure is not
  // this reference list's error.
  const inner: ListController<TRecord> = createListController<
    TResources,
    TName
  >({ ...ctx, notifications: undefined }, reference, {
    perPage: options.perPage ?? DEFAULT_REFERENCE_PER_PAGE,
    sort: options.sort,
    filterDefaultValues: options.filterDefaultValues,
    storeKey,
    enabled: false,
  });

  const initial = inner.getSnapshot();
  const store = createMicroStore<ListControllerState<TRecord>>(
    {
      ...initial,
      data: targetValue === undefined ? [] : undefined,
      total: targetValue === undefined ? 0 : undefined,
      pageInfo: undefined,
      isPending: targetValue !== undefined,
      isFetching: false,
      error: null,
      hasNextPage: targetValue === undefined ? false : undefined,
      hasPreviousPage: targetValue === undefined ? false : undefined,
    },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
    clearDebounce();
    inner.destroy();
  });

  /** Non-null exactly while attached to a record id. */
  let observer: QueryObserver<ReferenceResult, Error> | null = null;
  /** Rebuilds the attached observer's options from current state. */
  let reconfigure: (() => void) | null = null;

  /** The one place sort and the permanent filter are folded into a query. */
  const queryFor = (value: Identifier, page: number, perPage: number) => {
    const s = store.getSnapshot();
    return getManyReferenceOptions(ctx, reference, {
      target,
      id: value,
      pagination: { page, perPage },
      // A single object when there is exactly one key (adapter compat).
      sort: s.sort.length === 1 ? s.sort[0] : s.sort,
      filter: { ...s.filter, ...(options.filter ?? {}) },
    });
  };

  const buildOptions = (value: Identifier) => {
    const s = store.getSnapshot();
    return {
      ...queryFor(value, s.page, s.perPage),
      placeholderData: (prev: ReferenceResult | undefined) => prev,
      retry: false,
      enabled: options.enabled ?? true,
    };
  };

  // --- inner params -> outer state; the ONLY path that reconfigures the observer ---
  const mirror = (): void => {
    const next = inner.getSnapshot();
    const prev = store.getSnapshot();
    const queryChanged =
      next.page !== prev.page ||
      next.perPage !== prev.perPage ||
      next.sort !== prev.sort ||
      next.filter !== prev.filter;
    store.setState({
      page: next.page,
      perPage: next.perPage,
      sort: next.sort,
      filter: next.filter,
      displayedFilters: next.displayedFilters,
      selectedIds: next.selectedIds,
    });
    if (queryChanged) reconfigure?.();
  };

  /** Runs an inner action, then mirrors, so detached snapshots stay truthful. */
  const through =
    <TArgs extends unknown[]>(action: (...args: TArgs) => void) =>
    (...args: TArgs): void => {
      if (destroyed) return;
      action(...args);
      mirror();
    };

  // The debounce lives here, not in the inner controller: detached, nothing
  // subscribes to the inner store, so only this timer can mirror its late write.
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  function clearDebounce(): void {
    if (debounceTimer === undefined) return;
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  }

  const setFilters = (
    filter: FilterPayload<TRecord>,
    displayedFilters?: Record<string, boolean>,
    debounced = false,
  ): void => {
    if (destroyed) return;
    clearDebounce();
    const apply = (): void => {
      inner.setFilters(filter, displayedFilters);
      mirror();
    };
    if (!debounced) {
      apply();
      return;
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      apply();
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  };

  const setParams = (patch: ListParamsPatch<TRecord>): void => {
    // A pending debounced filter would overwrite this patch's filter.
    if (patch.filter !== undefined) clearDebounce();
    through(inner.setParams)(patch);
  };

  const selectAll = async (opts?: { limit?: number }): Promise<void> => {
    if (targetValue === undefined) return;
    return runSelectAll(
      ctx.notifications,
      async (limit) => {
        const result = await ctx.queryClient.fetchQuery({
          ...queryFor(targetValue, 1, limit),
          retry: false,
        });
        return result.data;
      },
      (ids) => {
        inner.select(ids);
        mirror();
      },
      () => destroyed,
      opts?.limit,
    );
  };

  const refetch = (): void => {
    if (destroyed) return;
    void observer?.refetch();
  };

  const maybeResetPage = (): void => {
    const resetTo = resetPageTarget(store.getSnapshot());
    if (resetTo === undefined) return;
    inner.setPage(resetTo);
    mirror();
  };

  // query-core clears `error` while a refetch is in flight, so the announcer
  // is never re-armed: the same error is not announced twice.
  const errors = createErrorAnnouncer(ctx.notifications);
  const onResult = (
    result: QueryObserverResult<ReferenceResult, Error>,
  ): void => {
    if (destroyed) return;
    const list = result.data;
    const { page, perPage } = store.getSnapshot();
    store.setState({
      data: list?.data,
      total: list?.total,
      pageInfo: list?.pageInfo,
      isPending: result.isPending,
      isFetching: result.isFetching,
      error: result.error ?? null,
      ...pageFlags(page, perPage, list?.total, list?.pageInfo),
    });
    errors.announce(result.error);
    maybeResetPage();
  };

  function acquire(): () => void {
    // The inner controller first: its persisted params and selection must be
    // mirrored before the observer's options are built from them.
    const unsubscribeInner = inner.subscribe(mirror);
    mirror();
    let unsubscribeObserver: (() => void) | undefined;
    if (targetValue !== undefined) {
      const value = targetValue;
      const attached = new QueryObserver<ReferenceResult, Error>(
        ctx.queryClient,
        buildOptions(value),
      );
      observer = attached;
      reconfigure = () => attached.setOptions(buildOptions(value));
      unsubscribeObserver = attached.subscribe(onResult);
      onResult(attached.getCurrentResult());
    }
    return () => {
      unsubscribeObserver?.();
      unsubscribeInner();
      clearDebounce();
      observer = null;
      reconfigure = null;
    };
  }

  return {
    ...store,
    setPage: through(inner.setPage),
    setPerPage: through(inner.setPerPage),
    setSort: through(inner.setSort),
    setFilters,
    setParams,
    showFilter: through(inner.showFilter),
    hideFilter: through(inner.hideFilter),
    select: through(inner.select),
    toggleItem: through(inner.toggleItem),
    unselectAll: through(inner.unselectAll),
    selectAll,
    refetch,
  };
}
