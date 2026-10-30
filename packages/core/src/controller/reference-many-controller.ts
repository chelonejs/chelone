import { QueryObserver, type QueryObserverResult } from "@tanstack/query-core";
import { getManyReferenceOptions } from "../data/query-options";
import type {
  FilterPayload,
  GetManyReferenceResult,
  SortPayload,
} from "../data/types";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { createMicroStore } from "../store/micro-store";
import {
  createErrorAnnouncer,
  createListController,
  DEFAULT_SELECT_ALL_LIMIT,
  type ListController,
  type ListControllerContext,
  type ListControllerState,
  notifyFetchError,
  notifySelectAllLimit,
  pageFlags,
  resetPageTarget,
} from "./list-controller";

export interface ReferenceManyControllerOptions {
  /** The field on the referenced-FROM resource that holds the foreign key. */
  target: string;
  /** The value `target` must equal. Null or undefined fetches nothing. */
  id: Identifier | null | undefined;
  /** Permanent filter, merged OVER the user filter for every fetch. */
  filter?: FilterPayload;
  /** Seed for the user filter when nothing is persisted. */
  filterDefaultValues?: FilterPayload;
  sort?: SortPayload | SortPayload[];
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
  enabled?: boolean;
}

/** Same state and actions as {@link ListController}, so it drops into a list context. */
export type ReferenceManyController<TRecord> = ListController<TRecord>;

const DEFAULT_PER_PAGE = 25;

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
  options: ReferenceManyControllerOptions,
): ReferenceManyController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type ReferenceResult = GetManyReferenceResult<TRecord>;

  const { target, id } = options;
  const recordId = id ?? undefined;
  const storeKey =
    options.storeKey ??
    (recordId === undefined ? false : `${reference}.${target}.${recordId}`);

  const inner = createListController(ctx, reference, {
    perPage: options.perPage ?? DEFAULT_PER_PAGE,
    sort: options.sort,
    filterDefaultValues: options.filterDefaultValues,
    debounceMs: options.debounceMs,
    storeKey,
    enabled: false,
  });

  const initial = inner.getSnapshot();
  const store = createMicroStore<ListControllerState<TRecord>>(
    {
      ...initial,
      data: recordId === undefined ? [] : undefined,
      total: recordId === undefined ? 0 : undefined,
      pageInfo: undefined,
      isPending: recordId !== undefined,
      isFetching: false,
      error: null,
      hasNextPage: recordId === undefined ? false : undefined,
      hasPreviousPage: recordId === undefined ? false : undefined,
    },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
    inner.destroy();
  });

  /** Non-null exactly while attached to a record id. */
  let observer: QueryObserver<ReferenceResult, Error> | null = null;

  const buildOptions = () => {
    const s = store.getSnapshot();
    return {
      ...getManyReferenceOptions(ctx, reference, {
        target,
        id: recordId as Identifier,
        pagination: { page: s.page, perPage: s.perPage },
        sort: s.sort.length === 1 ? s.sort[0] : s.sort,
        filter: { ...s.filter, ...(options.filter ?? {}) },
      }),
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
    if (queryChanged) observer?.setOptions(buildOptions());
  };

  /** Runs an inner action, then mirrors, so detached snapshots stay truthful. */
  const through =
    <TArgs extends unknown[]>(action: (...args: TArgs) => void) =>
    (...args: TArgs): void => {
      action(...args);
      mirror();
    };

  const selectAll = async (opts?: { limit?: number }): Promise<void> => {
    if (destroyed || recordId === undefined) return;
    const limit = opts?.limit ?? DEFAULT_SELECT_ALL_LIMIT;
    const s = store.getSnapshot();
    try {
      const result = await ctx.queryClient.fetchQuery({
        ...getManyReferenceOptions(ctx, reference, {
          target,
          id: recordId,
          pagination: { page: 1, perPage: limit },
          sort: s.sort.length === 1 ? s.sort[0] : s.sort,
          filter: { ...s.filter, ...(options.filter ?? {}) },
        }),
        retry: false,
      });
      if (destroyed) return;
      inner.select(result.data.map((record) => (record as ResourceRecord).id));
      mirror();
      notifySelectAllLimit(ctx.notifications, result.data.length, limit);
    } catch (error) {
      if (destroyed) return;
      notifyFetchError(ctx.notifications, error);
    }
  };

  const refetch = (): void => {
    if (destroyed) return;
    void observer?.refetch();
  };

  const maybeResetPage = (): void => {
    const target = resetPageTarget(store.getSnapshot());
    if (target === undefined) return;
    inner.setPage(target);
    mirror();
  };

  // query-core clears `error` while a refetch is in flight, so the announcer
  // is never re-armed: the same error is not announced twice.
  const errors = createErrorAnnouncer(ctx.notifications);
  const onResult = (
    result: QueryObserverResult<ReferenceResult, Error>,
  ): void => {
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
    if (recordId !== undefined) {
      const attached = new QueryObserver<ReferenceResult, Error>(
        ctx.queryClient,
        buildOptions(),
      );
      observer = attached;
      unsubscribeObserver = attached.subscribe(onResult);
      onResult(attached.getCurrentResult());
    }
    return () => {
      unsubscribeObserver?.();
      unsubscribeInner();
      observer = null;
    };
  }

  return {
    ...store,
    setPage: through(inner.setPage),
    setPerPage: through(inner.setPerPage),
    setSort: through(inner.setSort),
    setFilters: through(inner.setFilters),
    setParams: through(inner.setParams),
    showFilter: through(inner.showFilter),
    hideFilter: through(inner.hideFilter),
    select: through(inner.select),
    toggleItem: through(inner.toggleItem),
    unselectAll: through(inner.unselectAll),
    selectAll,
    refetch,
  };
}
