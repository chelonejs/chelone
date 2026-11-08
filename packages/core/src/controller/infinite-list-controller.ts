import {
  type InfiniteData,
  InfiniteQueryObserver,
  type InfiniteQueryObserverResult,
  QueryClient,
} from "@tanstack/query-core";
import type { infiniteListKey } from "../data/keys";
import { getInfiniteListOptions, getListOptions } from "../data/query-options";
import type { GetListResult } from "../data/types";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import {
  createErrorAnnouncer,
  createListController,
  type ListController,
  type ListControllerContext,
  type ListControllerOptions,
  type ListControllerState,
  runSelectAll,
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
  /** Appends the next page. Shares an ongoing next-page load; waits for other loads. Does nothing without a next page. */
  fetchNextPage(): Promise<void>;
  /** Prepends the previous page. Shares an ongoing previous-page load; waits for other loads. Does nothing without a previous page. */
  fetchPreviousPage(): Promise<void>;
}

type ParamsSlice<TRecord> = Pick<
  ListControllerState<TRecord>,
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
 * out-of-range page reset of the list controller does not apply: the inner
 * controller reads a private empty cache, so no result can trigger it.
 */
export function createInfiniteListController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: ListControllerContext<TResources>,
  resource: TName,
  options: ListControllerOptions<RecordOf<TResources, TName>> = {},
): InfiniteListController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type Page = GetListResult<TRecord>;

  // The inner controller never fetches, but its disabled observer still reads
  // the `getList` entry that matches its params: a cached failure, or stale
  // data feeding its out-of-range page reset, would leak into this list. It
  // gets a private empty cache and no notifications, so it sees none of that.
  // Errors and `selectAll` are handled here, on the real client.
  const innerCache = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  const inner = createListController(
    { ...ctx, queryClient: innerCache, notifications: undefined },
    resource,
    { ...options, enabled: false },
  );

  const paramsOf = (): ParamsSlice<TRecord> => {
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
    innerCache.clear();
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
  let applied: ParamsSlice<TRecord> | null = null;
  /**
   * The page load or refetch this controller has running. A second load
   * started on the same query would cancel the first (query-core's default),
   * so another load waits for it instead.
   */
  let busy: {
    kind: "next" | "previous" | "refetch";
    promise: Promise<void>;
  } | null = null;

  /** Sort and filter of a request: the infinite fetch and `selectAll` share them. */
  const requestParams = (
    s: Pick<ListControllerState<TRecord>, "sort" | "filter">,
  ) => ({
    // A single object when there is exactly one key (adapter compat).
    sort: s.sort.length === 1 ? s.sort[0] : s.sort,
    // The permanent filter merges OVER the user filter.
    filter: { ...s.filter, ...(options.filter ?? {}) },
  });

  const buildOptions = () => {
    const s = inner.getSnapshot();
    applied = s;
    return {
      ...getInfiniteListOptions(ctx, resource, {
        pagination: { page: s.page, perPage: s.perPage },
        ...requestParams(s),
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
      // A new query key: the running load belongs to the old query.
      busy = null;
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
      lastPages = undefined;
      lastRows = undefined;
      busy = null;
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

  /** Records `promise` as the running load until it settles. */
  const track = (
    kind: "next" | "previous" | "refetch",
    promise: Promise<void>,
  ): Promise<void> => {
    const entry = { kind, promise };
    busy = entry;
    void promise.then(() => {
      if (busy === entry) busy = null;
    });
    return promise;
  };

  // The failure of a load reaches state and notifications through onResult.
  const swallow = (): undefined => undefined;

  const fetchMore = (direction: "next" | "previous"): Promise<void> => {
    if (destroyed || !observer) return Promise.resolve();
    if (busy) {
      if (busy.kind === direction) return busy.promise;
      // Another load is running: starting this one now would cancel it.
      return busy.promise.then(() => fetchMore(direction));
    }
    const current = observer.getCurrentResult();
    if (
      direction === "next" ? !current.hasNextPage : !current.hasPreviousPage
    ) {
      return Promise.resolve();
    }
    const started =
      direction === "next"
        ? observer.fetchNextPage()
        : observer.fetchPreviousPage();
    return track(direction, started.then(swallow, swallow));
  };

  const refetch = (): void => {
    // Detached there is no observer: the next attach loads current params anyway.
    if (destroyed || !observer) return;
    if (busy) {
      // A refetch already running reloads every page; a page load finishes first.
      if (busy.kind !== "refetch") void busy.promise.then(refetch);
      return;
    }
    void track("refetch", observer.refetch().then(swallow, swallow));
  };

  const selectAll = (opts?: { limit?: number }): Promise<void> =>
    runSelectAll(
      ctx.notifications,
      async (limit) => {
        // The inner snapshot is the source of truth: a debounced filter may have
        // landed in it while detached.
        const s = inner.getSnapshot();
        const result = await ctx.queryClient.fetchQuery({
          ...getListOptions(ctx, resource, {
            pagination: { page: 1, perPage: limit },
            ...requestParams(s),
          }),
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
    fetchNextPage: () => fetchMore("next"),
    fetchPreviousPage: () => fetchMore("previous"),
  };
}
