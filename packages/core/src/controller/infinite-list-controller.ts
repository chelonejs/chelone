import {
  type InfiniteData,
  InfiniteQueryObserver,
  type InfiniteQueryObserverResult,
} from "@tanstack/query-core";
import type { infiniteListKey } from "../data/keys";
import { getInfiniteListOptions, getListOptions } from "../data/query-options";
import type { GetListResult } from "../data/types";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import {
  createErrorAnnouncer,
  createListController,
  DEFAULT_SELECT_ALL_LIMIT,
  type ListController,
  type ListControllerContext,
  type ListControllerOptions,
  type ListControllerState,
  notifyFetchError,
  notifySelectAllLimit,
} from "./list-controller";

export interface InfiniteListControllerState<TRecord>
  extends ListControllerState<TRecord> {
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
}

export interface InfiniteListController<TRecord>
  extends MicroStore<InfiniteListControllerState<TRecord>>,
    Omit<
      ListController<TRecord>,
      keyof MicroStore<ListControllerState<TRecord>>
    > {
  /** Appends the next page. Does nothing without a next page or while one is loading. */
  fetchNextPage(): Promise<void>;
  /** Prepends the page before the first loaded one. Does nothing without one or while one is loading. */
  fetchPreviousPage(): Promise<void>;
}

type ParamsSlice = Pick<
  ListControllerState<unknown>,
  "page" | "perPage" | "sort" | "filter" | "displayedFilters" | "selectedIds"
>;

/**
 * Vanilla infinite list controller: list params and selection from an inner
 * {@link createListController} (disabled, so it never fetches), data from its
 * own InfiniteQueryObserver that gathers every loaded page into one list.
 *
 * Lifecycle (Task 4R): construction is INERT. The first subscriber acquires
 * the inner controller and the observer, the last unsubscribe releases both,
 * and `destroy()` is the hard teardown. Re-attach rebuilds the query options
 * from the inner controller's CURRENT params.
 *
 * Loop-prevention rule, as in `createListController`: `observer.setOptions`
 * runs ONLY when the inner params change, never from the observer result.
 * The query key holds the start page, so any param change, `setPage`
 * included, drops the loaded pages and loads from the new start page. The
 * out-of-range page reset of the list controller does not apply.
 */
export function createInfiniteListController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: ListControllerContext<TResources>,
  resource: TName,
  options: ListControllerOptions = {},
): InfiniteListController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type Page = GetListResult<TRecord>;

  // The inner controller still observes the `getList` entry that matches its
  // params, so it gets no notifications: a cached `getList` failure is not
  // this infinite list's error. Errors and `selectAll` are announced here.
  const inner = createListController(
    { ...ctx, notifications: undefined },
    resource,
    { ...options, enabled: false },
  );

  const paramsOf = (): ParamsSlice => {
    const { page, perPage, sort, filter, displayedFilters, selectedIds } =
      inner.getSnapshot();
    return { page, perPage, sort, filter, displayedFilters, selectedIds };
  };

  const store = createMicroStore<InfiniteListControllerState<TRecord>>(
    {
      ...paramsOf(),
      data: undefined,
      total: undefined,
      pageInfo: undefined,
      isPending: true,
      isFetching: false,
      isFetchingNextPage: false,
      isFetchingPreviousPage: false,
      error: null,
      hasNextPage: undefined,
      hasPreviousPage: undefined,
    },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
    inner.destroy();
  });

  type Observer = InfiniteQueryObserver<
    Page,
    Error,
    InfiniteData<Page, number>,
    ReturnType<typeof infiniteListKey>,
    number
  >;
  /** Non-null exactly while attached. */
  let observer: Observer | null = null;
  /** The params the observer's options were last built from. */
  let applied: ParamsSlice | null = null;
  let fetchingNext: Promise<void> | null = null;
  let fetchingPrevious: Promise<void> | null = null;

  const buildOptions = () => {
    const s = inner.getSnapshot();
    applied = paramsOf();
    return {
      ...getInfiniteListOptions(ctx, resource, {
        pagination: { page: s.page, perPage: s.perPage },
        sort: s.sort.length === 1 ? s.sort[0] : s.sort,
        filter: { ...s.filter, ...(options.filter ?? {}) },
      }),
      retry: false,
      enabled: options.enabled ?? true,
    };
  };

  /** Params and selection live in the inner controller; this copies them over. */
  const mirror = (): void => {
    store.setState(paramsOf());
  };

  /** The ONLY path that reconfigures the observer: the inner params changed. */
  const onInner = (): void => {
    mirror();
    if (!observer || !applied) return;
    const next = inner.getSnapshot();
    if (
      next.page !== applied.page ||
      next.perPage !== applied.perPage ||
      next.sort !== applied.sort ||
      next.filter !== applied.filter
    ) {
      observer.setOptions(buildOptions());
    }
  };

  const errors = createErrorAnnouncer(ctx.notifications);
  let lastPages: Page[] | undefined;
  let lastRows: TRecord[] | undefined;
  const onResult = (
    result: InfiniteQueryObserverResult<InfiniteData<Page, number>, Error>,
  ): void => {
    const pages = result.data?.pages;
    // Same pages, same flattened array: an unrelated result change must not
    // look like a data change to a subscriber.
    if (pages !== lastPages) {
      lastPages = pages;
      lastRows = pages?.flatMap((page) => page.data);
    }
    const last = pages?.[pages.length - 1];
    store.setState({
      data: lastRows,
      total: last?.total,
      pageInfo: last?.pageInfo,
      isPending: result.isPending,
      isFetching: result.isFetching,
      isFetchingNextPage: result.isFetchingNextPage,
      isFetchingPreviousPage: result.isFetchingPreviousPage,
      error: result.error ?? null,
      hasNextPage: pages ? result.hasNextPage : undefined,
      hasPreviousPage: pages ? result.hasPreviousPage : undefined,
    });
    if (result.error) errors.announce(result.error);
    else errors.rearm();
  };

  function acquire(): () => void {
    const unsubscribeInner = inner.subscribe(onInner);
    // Params or selection may have moved while detached.
    mirror();
    const attached: Observer = new InfiniteQueryObserver(
      ctx.queryClient,
      buildOptions(),
    );
    observer = attached;
    const unsubscribeObserver = attached.subscribe(onResult);
    // Sync the optimistic first result (covers cached data + enabled: false).
    onResult(attached.getCurrentResult());
    return () => {
      unsubscribeObserver();
      unsubscribeInner();
      observer = null;
      applied = null;
      fetchingNext = null;
      fetchingPrevious = null;
    };
  }

  // --- actions: the inner controller owns params and selection ---
  const through =
    <A extends unknown[], R>(action: (...args: A) => R) =>
    (...args: A): R => {
      const result = action(...args);
      // Detached, nothing subscribes the inner controller; keep snapshots truthful.
      if (!destroyed) mirror();
      return result;
    };

  const fetchMore = (direction: "next" | "previous"): Promise<void> => {
    if (destroyed || !observer) return Promise.resolve();
    const running = direction === "next" ? fetchingNext : fetchingPrevious;
    if (running) return running;
    const current = observer.getCurrentResult();
    if (
      direction === "next" ? !current.hasNextPage : !current.hasPreviousPage
    ) {
      return Promise.resolve();
    }
    const started = (
      direction === "next"
        ? observer.fetchNextPage()
        : observer.fetchPreviousPage()
    ).then(
      () => undefined,
      () => undefined, // the failure reaches state and notifications through onResult
    );
    const clear = (): void => {
      if (direction === "next") {
        if (fetchingNext === started) fetchingNext = null;
      } else if (fetchingPrevious === started) fetchingPrevious = null;
    };
    if (direction === "next") fetchingNext = started;
    else fetchingPrevious = started;
    void started.then(clear);
    return started;
  };

  const selectAll = async (opts?: { limit?: number }): Promise<void> => {
    if (destroyed) return;
    const limit = opts?.limit ?? DEFAULT_SELECT_ALL_LIMIT;
    // The inner snapshot is the source of truth: a debounced filter may have
    // landed in it while detached.
    const s = inner.getSnapshot();
    try {
      const result = await ctx.queryClient.fetchQuery({
        ...getListOptions(ctx, resource, {
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
    refetch: () => {
      if (destroyed) return;
      // Detached there is no observer: the next attach loads current params anyway.
      void observer?.refetch();
    },
    fetchNextPage: () => fetchMore("next"),
    fetchPreviousPage: () => fetchMore("previous"),
  };
}
