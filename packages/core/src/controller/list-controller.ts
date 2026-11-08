import { QueryObserver, type QueryObserverResult } from "@tanstack/query-core";
import { type DataContext, getListOptions } from "../data/query-options";
import { removeEmpty } from "../data/remove-empty";
import type {
  DisplayedFilters,
  FilterPayload,
  GetListResult,
  LooseDisplayedFilters,
  LooseFilterPayload,
  LooseSortPayload,
  PageInfo,
  SortPayload,
} from "../data/types";
import { isRecord } from "../guards";
import type { NotificationStore } from "../notification/notification-store";
import type { Identifier } from "../resource/identifier";
import type { LooseRecord, ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type { RecordFilterKey } from "../resource/source-path";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import type { CheloneStore } from "../store/store";

export interface ListControllerState<TRecord = LooseRecord> {
  page: number;
  perPage: number;
  /** Always an array in controller state — multi-sort is first-class. */
  sort: SortPayload<TRecord>[];
  filter: FilterPayload<TRecord>;
  displayedFilters: DisplayedFilters<TRecord>;
  selectedIds: Identifier[];
  data: TRecord[] | undefined;
  total: number | undefined;
  pageInfo: PageInfo | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: Error | null;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
}

/**
 * Several list params applied as one change: one state update, one persisted
 * write and one query reconfiguration. Every key is optional; an omitted key
 * stays as it is.
 */
export interface ListParamsPatch<TRecord = LooseRecord> {
  /** Replaces the user filter; empty values are stripped. */
  filter?: FilterPayload<TRecord>;
  displayedFilters?: DisplayedFilters<TRecord>;
  /** Replaces wholesale; a single payload never toggles the order. */
  sort?: SortPayload<TRecord> | SortPayload<TRecord>[];
  perPage?: number;
  /** Defaults to 1 when the patch holds `filter`, `sort` or `perPage`. */
  page?: number;
}

/**
 * A {@link ListParamsPatch} with the record type erased: the filter and the
 * displayed filters are open key maps and the sort an open field name. Each
 * adapter's list context carries this, because a context cannot be generic and
 * a controller typed to any record must mount in one.
 *
 * Written as `Omit` plus fresh `filter`, `displayedFilters` and `sort`, not as
 * `ListParamsPatch` itself:
 * TypeScript compares two instantiations of one generic interface by the
 * variance of their type argument, so a `ListParamsPatch<Post>` never reaches
 * `ListParamsPatch<LooseRecord>` however the fields read. As a separate type
 * the two line up field by field.
 */
export type LooseListParamsPatch = Omit<
  ListParamsPatch,
  "filter" | "sort" | "displayedFilters"
> & {
  filter?: LooseFilterPayload;
  displayedFilters?: LooseDisplayedFilters;
  sort?: LooseSortPayload | LooseSortPayload[];
};

/**
 * A list controller's state and actions, without the micro-store plumbing each
 * adapter re-binds through its own reactive seam (`useSyncExternalStore` in
 * React, `useMicroStore` in Vue).
 */
export type ListControllerSurface<TRecord> = ListControllerState<TRecord> &
  Omit<ListController<TRecord>, keyof MicroStore<ListControllerState<TRecord>>>;

/**
 * The list surface an adapter's list context publishes: the rows typed to
 * `TRecord`, the filter an open key map.
 *
 * The sort is as open as the filter, for the same reason: a column header or a
 * URL names a field with no record to check it, so `sort` and `setSort` take
 * the structural {@link LooseSortPayload}: a `SortPayload<Post>` never reaches
 * `SortPayload<LooseRecord>` by variance, as with {@link LooseListParamsPatch}.
 * A record's own sort fields are the job of
 * {@link ListController.setSort} and the options of each controller.
 *
 * The filter is open on purpose. What writes a context filter names no record:
 * a filter form's field names, a calendar's range keys, a URL query. A record's
 * own filter keys are the job of {@link ListController.setFilters} and the
 * hooks, which are generic over the record. Erasing only the filter is what
 * lets a controller typed to any record be mounted in one context.
 *
 * The displayed filters and the two actions that move them are open for the
 * same reason, and they must be erased together with it: a filter input names
 * its filter by a plain `source` (`FilterElementProps` in React's filter form),
 * so a context keyed by the record would stop every filter input compiling in a
 * registered app.
 */
export type ListContextSurface<TRecord = ResourceRecord> = Omit<
  ListControllerSurface<TRecord>,
  | "filter"
  | "setFilters"
  | "setParams"
  | "sort"
  | "setSort"
  | "displayedFilters"
  | "showFilter"
  | "hideFilter"
> & {
  sort: LooseSortPayload[];
  setSort(sort: LooseSortPayload | LooseSortPayload[]): void;
  filter: LooseFilterPayload;
  displayedFilters: LooseDisplayedFilters;
  setFilters(
    filter: LooseFilterPayload,
    displayedFilters?: LooseDisplayedFilters,
    debounced?: boolean,
  ): void;
  setParams(patch: LooseListParamsPatch): void;
  showFilter(name: string, defaultValue?: unknown): void;
  hideFilter(name: string): void;
};

export interface ListController<TRecord>
  extends MicroStore<ListControllerState<TRecord>> {
  /** The `perPage` the list starts at when nothing is persisted or in the URL. Optional so other list controllers and fakes need not set it. */
  readonly defaultPerPage?: number;
  setPage(page: number): void;
  setPerPage(perPage: number): void;
  /** Single payload on the SAME single-sorted field toggles order; anything else replaces. */
  setSort(sort: SortPayload<TRecord> | SortPayload<TRecord>[]): void;
  setFilters(
    filter: FilterPayload<TRecord>,
    displayedFilters?: DisplayedFilters<TRecord>,
    debounced?: boolean,
  ): void;
  /** Applies a {@link ListParamsPatch} as one change (one persisted write, one query update; a fetch only if the query changes). An empty patch does nothing. Never debounced. */
  setParams(patch: ListParamsPatch<TRecord>): void;
  /** Shows the filter input `name`, and writes `{ [name]: defaultValue }` into the filter when a default is given. */
  showFilter(name: RecordFilterKey<TRecord>, defaultValue?: unknown): void;
  /** Hides the filter input `name` and removes that path from the filter. */
  hideFilter(name: RecordFilterKey<TRecord>): void;
  select(ids: Identifier[]): void;
  toggleItem(id: Identifier): void;
  unselectAll(): void;
  selectAll(options?: { limit?: number }): Promise<void>;
  refetch(): void;
}

export interface ListControllerContext<
  TResources extends ResourceMap = ResourceMap,
> extends DataContext<TResources> {
  store?: CheloneStore;
  notifications?: NotificationStore;
  translate?: (key: string) => string;
}

export interface ListControllerOptions<TRecord = LooseRecord> {
  perPage?: number;
  sort?: SortPayload<TRecord> | SortPayload<TRecord>[];
  /** Permanent filter — merged OVER the user filter for every fetch. */
  filter?: FilterPayload<TRecord>;
  /** Seed for the user filter when nothing is persisted. */
  filterDefaultValues?: FilterPayload<TRecord>;
  /** Debounce delay for `setFilters(..., debounced=true)`. Default 500ms. */
  debounceMs?: number;
  /** KV namespace for params/selection persistence. Default: the resource name. `false` disables persistence. */
  storeKey?: string | false;
  enabled?: boolean;
}

interface PersistedListParams<TRecord> {
  page: number;
  perPage: number;
  sort: SortPayload<TRecord>[];
  filter: FilterPayload<TRecord>;
  displayedFilters: DisplayedFilters<TRecord>;
}

/** The `perPage` a list starts at when nothing is persisted or in the URL. The single definition: `prev-next` and both adapters read this. */
export const DEFAULT_PER_PAGE = 10;
/** Debounce delay for `setFilters(..., debounced=true)` when no `debounceMs` option is given. Shared with the reference-many and choices controllers. */
export const DEFAULT_DEBOUNCE_MS = 500;
export const DEFAULT_SELECT_ALL_LIMIT = 250;

/**
 * The sort a list starts on: `id` ascending, as it always was. This is the one
 * cast this change adds. A schema is not required to declare `id`, so a record
 * this generic cannot prove carries the path; a resource without one still sends
 * `id` to its provider, exactly as before the sort was keyed by the record.
 */
function defaultSort<TRecord>(): SortPayload<TRecord>[] {
  return [
    {
      // type-escape: `id` is the primary key a data provider orders by when no sort is given; a deferred `TRecord` cannot prove `SourcePath<TRecord>` holds it
      field: "id" as SortPayload<TRecord>["field"],
      order: "ASC",
    },
  ];
}

/**
 * A sort prop as controller state: always an array, always a fresh copy, so a
 * caller's payload is never the object the controller holds. `fallback` is what
 * an absent sort becomes. Shared with the client controller.
 */
export function normalizeSort<TRecord>(
  sort: SortPayload<TRecord> | SortPayload<TRecord>[] | undefined,
  fallback: SortPayload<TRecord>[],
): SortPayload<TRecord>[] {
  if (!sort) return fallback.map((entry) => ({ ...entry }));
  const entries = Array.isArray(sort) ? sort : [sort];
  return entries.map((entry) => ({ ...entry }));
}

/**
 * The sort a `setSort` input produces: a single payload on the SAME
 * single-sorted field toggles its order (ra-core column-header semantics);
 * anything else replaces. Shared with the client controller.
 */
export function nextSortOf<TRecord>(
  current: SortPayload<TRecord>[],
  input: SortPayload<TRecord> | SortPayload<TRecord>[],
): SortPayload<TRecord>[] {
  if (Array.isArray(input)) return input.map((entry) => ({ ...entry }));
  const single = current.length === 1 ? current[0] : undefined;
  if (single && single.field === input.field) {
    return [
      { field: input.field, order: single.order === "ASC" ? "DESC" : "ASC" },
    ];
  }
  return [{ field: input.field, order: input.order ?? "ASC" }];
}

/**
 * `branch` with the dotted `keys` removed from `depth` on: every branch it
 * rebuilds is a copy, and it returns `branch` itself when nothing under it
 * changed, so the caller can tell "untouched" from "pruned".
 */
function pruneFilterBranch(
  branch: Record<string, unknown>,
  keys: string[],
  depth: number,
): Record<string, unknown> {
  const key = keys[depth];
  if (key === undefined) return branch;
  const child = branch[key];
  if (depth === keys.length - 1) {
    const { [key]: _removed, ...others } = branch;
    return others;
  }
  if (!isRecord(child)) return branch;
  const pruned = pruneFilterBranch(child, keys, depth + 1);
  if (pruned === child) return branch;
  if (Object.keys(pruned).length === 0) {
    const { [key]: _emptied, ...others } = branch;
    return others;
  }
  return { ...branch, [key]: pruned };
}

/**
 * Returns `filter` without the value at `path`: the flat key of that name and,
 * for a dotted path, the nested value, pruning parents it leaves empty. Never
 * mutates `filter`. Shared with the client controller.
 */
export function removeFilterPath<TRecord = LooseRecord>(
  filter: FilterPayload<TRecord>,
  path: string,
): FilterPayload<TRecord> {
  const result: FilterPayload<TRecord> = { ...filter };
  // `pruned` is that fresh copy seen through its loose shape: pruning walks
  // nested keys, and a typed filter names no index signature to walk in. Only
  // this copy is written to; a nested branch is rebuilt, never mutated.
  const pruned: LooseFilterPayload = result;
  delete pruned[path];
  const keys = path.split(".");
  const [head] = keys;
  if (head === undefined || keys.length === 1) return result;
  const branch = pruned[head];
  if (!isRecord(branch)) return result;
  const kept = pruneFilterBranch(branch, keys, 1);
  if (kept === branch) return result;
  if (Object.keys(kept).length === 0) delete pruned[head];
  else pruned[head] = kept;
  return result;
}

/**
 * The displayed filters without the entry named `name`: always a fresh copy,
 * never the map it was given. Shared with the client controller.
 */
export function removeDisplayedFilter<TRecord = LooseRecord>(
  displayedFilters: DisplayedFilters<TRecord>,
  name: RecordFilterKey<TRecord>,
): DisplayedFilters<TRecord> {
  const kept: DisplayedFilters<TRecord> = { ...displayedFilters };
  // Key-wise deletion needs an index signature, which a typed map has none of:
  // `open` is the fresh copy seen through {@link LooseDisplayedFilters}, so
  // deleting a key here deletes it from `kept`. The bare `DisplayedFilters`
  // would not do: once an app registers resources its keys are the registered
  // union, and a deferred `RecordFilterKey` cannot index it.
  const open: LooseDisplayedFilters = kept;
  delete open[name];
  return kept;
}

/**
 * Turns a {@link ListParamsPatch} into the state slice it changes. Shared with
 * the client controller so the page-reset rule lives in one place.
 */
export function listParamsFromPatch<TRecord>(
  patch: ListParamsPatch<TRecord>,
): Partial<
  Pick<
    ListControllerState<TRecord>,
    "page" | "perPage" | "sort" | "filter" | "displayedFilters"
  >
> {
  const next: Partial<ListControllerState<TRecord>> = {};
  if (patch.filter !== undefined) next.filter = removeEmpty(patch.filter);
  if (patch.displayedFilters !== undefined) {
    next.displayedFilters = { ...patch.displayedFilters };
  }
  if (patch.sort !== undefined) next.sort = normalizeSort(patch.sort, []);
  if (patch.perPage !== undefined) next.perPage = patch.perPage;
  if (patch.page !== undefined) {
    next.page = patch.page;
  } else if (
    patch.filter !== undefined ||
    patch.sort !== undefined ||
    patch.perPage !== undefined
  ) {
    next.page = 1;
  }
  return next;
}

/** The notification key for a failed fetch: the error's own message, else `chelone.notification.http_error`. */
export function errorMessageKey(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return message || "chelone.notification.http_error";
}

/** Notifies a failed fetch under its message, falling back to the generic http error. */
export function notifyFetchError(
  notifications: NotificationStore | undefined,
  error: unknown,
): void {
  notifications?.notify(errorMessageKey(error), {
    type: "error",
    messageArgs: { _: String(error) },
  });
}

/** Warns that `selectAll` stopped at `limit` rows. A shorter result is complete and stays quiet. */
export function notifySelectAllLimit(
  notifications: NotificationStore | undefined,
  count: number,
  limit: number,
): void {
  if (count < limit) return;
  notifications?.notify("chelone.message.select_all_limit_reached", {
    type: "warning",
    messageArgs: { max: limit },
  });
}

/**
 * Fetches one page with `limit` (default 250), applies its ids, then warns at
 * the limit. Fetch, apply and warning failures use `notifyFetchError`.
 * Destruction skips the fetch or suppresses its result and failure notification.
 */
export async function runSelectAll(
  notifications: NotificationStore | undefined,
  fetchPage: (limit: number) => Promise<ResourceRecord[]>,
  apply: (ids: Identifier[]) => void,
  isDestroyed: () => boolean,
  limit = DEFAULT_SELECT_ALL_LIMIT,
): Promise<void> {
  if (isDestroyed()) return;
  try {
    const rows = await fetchPage(limit);
    if (isDestroyed()) return;
    apply(rows.map((record) => record.id));
    notifySelectAllLimit(notifications, rows.length, limit);
  } catch (error) {
    if (isDestroyed()) return;
    notifyFetchError(notifications, error);
  }
}

/**
 * Notifies a distinct error OBJECT once however many results carry it (a new
 * Error with the same message is a new failure and is announced). `rearm`
 * forgets the last one, so a controller that wants the same error announced
 * again after a success can say so.
 */
export function createErrorAnnouncer(
  notifications: NotificationStore | undefined,
): { announce(error: Error | null): void; rearm(): void } {
  let last: Error | null = null;
  return {
    announce(error) {
      if (!error || error === last) return;
      last = error;
      notifyFetchError(notifications, error);
    },
    rearm() {
      last = null;
    },
  };
}

/** `hasNextPage`/`hasPreviousPage` from the provider's `pageInfo` or, failing that, the total. */
export function pageFlags(
  page: number,
  perPage: number,
  total: number | undefined,
  pageInfo: PageInfo | undefined,
): Pick<
  ListControllerState<ResourceRecord>,
  "hasNextPage" | "hasPreviousPage"
> {
  if (pageInfo) {
    return {
      hasNextPage: pageInfo.hasNextPage,
      hasPreviousPage: pageInfo.hasPreviousPage,
    };
  }
  if (total !== undefined) {
    return { hasNextPage: page * perPage < total, hasPreviousPage: page > 1 };
  }
  return { hasNextPage: undefined, hasPreviousPage: undefined };
}

/**
 * The page an out-of-range state should move to, or undefined when it is in
 * range. Only a SETTLED result may move past page 1, so a reset-induced
 * refetch can never trigger another reset.
 */
export function resetPageTarget(
  s: Pick<
    ListControllerState<ResourceRecord>,
    "page" | "perPage" | "total" | "data" | "isPending" | "isFetching"
  >,
): number | undefined {
  if (s.page <= 0) return 1;
  if (s.isPending || s.isFetching) return undefined;
  if (s.total !== undefined) {
    const lastPage = Math.max(Math.ceil(s.total / s.perPage), 1);
    return s.page > lastPage ? lastPage : undefined;
  }
  if (s.page > 1 && s.data !== undefined && s.data.length === 0) return 1;
  return undefined;
}

/**
 * Vanilla list controller: one QueryObserver mapped into a micro-store.
 *
 * Lifecycle (Task 4R): construction is INERT — pure state + closures, zero
 * subscriptions, zero fetching. A controller constructed in a discarded
 * React render (Suspense retry, StrictMode double render, hidden
 * <Activity> pre-render) is plain garbage, never a zombie. Acquisition
 * (QueryObserver + KV selection subscription) happens on the micro-store's
 * FIRST subscriber; the LAST unsubscribe releases everything. Attach/detach
 * cycles are re-entrant; re-attach rebuilds query options from CURRENT
 * state, so params changed while detached take effect on the next attach.
 * `destroy()` remains the hard imperative teardown for non-React consumers.
 *
 * Loop-prevention architecture rule: `observer.setOptions` is called ONLY
 * from param-mutating actions — never directly from the observer result
 * subscription. Out-of-range page resets go through the normal `setPage`
 * action path and are guarded to run only on SETTLED results, so they
 * cannot ping-pong.
 */
/**
 * The actions of a list controller, for an adapter to spread next to its own
 * reactive state. They are the same functions across state changes.
 */
export function listControllerActions<TRecord>(
  controller: Omit<
    ListController<TRecord>,
    keyof MicroStore<ListControllerState<TRecord>> | "defaultPerPage"
  >,
) {
  return {
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
  };
}

export function createListController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: ListControllerContext<TResources>,
  resource: TName,
  options: ListControllerOptions<RecordOf<TResources, TName>> = {},
): ListController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type ListResult = GetListResult<TRecord>;

  const storeKey =
    options.storeKey === false ? null : (options.storeKey ?? resource);
  const paramsKey = storeKey ? `${storeKey}.listParams` : null;
  const selectionKey = storeKey ? `${storeKey}.selectedIds` : null;
  const kv = ctx.store;

  // --- initial params: persisted (when available) over option defaults ---
  const defaults: PersistedListParams<TRecord> = {
    page: 1,
    perPage: options.perPage ?? DEFAULT_PER_PAGE,
    sort: normalizeSort(options.sort, defaultSort<TRecord>()),
    filter: { ...(options.filterDefaultValues ?? {}) },
    displayedFilters: {},
  };
  const persisted =
    paramsKey && kv
      ? kv.getItem<Partial<PersistedListParams<TRecord>>>(paramsKey)
      : undefined;
  const initialParams: PersistedListParams<TRecord> = persisted
    ? {
        page: persisted.page ?? defaults.page,
        perPage: persisted.perPage ?? defaults.perPage,
        sort: normalizeSort(persisted.sort, defaults.sort),
        filter: { ...(persisted.filter ?? defaults.filter) },
        displayedFilters: { ...(persisted.displayedFilters ?? {}) },
      }
    : defaults;

  const readSelection = (): Identifier[] =>
    (selectionKey && kv ? kv.getItem<Identifier[]>(selectionKey) : undefined) ??
    [];

  const store = createMicroStore<ListControllerState<TRecord>>(
    {
      ...initialParams,
      selectedIds: readSelection(),
      data: undefined,
      total: undefined,
      pageInfo: undefined,
      isPending: true,
      isFetching: false,
      error: null,
      hasNextPage: undefined,
      hasPreviousPage: undefined,
    },
    // Acquisition is subscription-driven: nothing is fetched or subscribed
    // until the first subscriber attaches (see `acquire` below, hoisted).
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
  });

  /** Non-null exactly while attached — doubles as the attached flag. */
  let observer: QueryObserver<ListResult, Error> | null = null;

  // --- query wiring: ONE observer, options rebuilt on every param change ---
  const buildOptions = () => {
    const s = store.getSnapshot();
    return {
      ...getListOptions(ctx, resource, {
        pagination: { page: s.page, perPage: s.perPage },
        // Pass a single object when there is exactly one key (adapter compat).
        sort: s.sort.length === 1 ? s.sort[0] : s.sort,
        filter: { ...s.filter, ...(options.filter ?? {}) },
      }),
      placeholderData: (prev: ListResult | undefined) => prev,
      retry: false,
      enabled: options.enabled ?? true,
    };
  };

  const persistParams = (): void => {
    if (!paramsKey || !kv) return;
    const s = store.getSnapshot();
    const params: PersistedListParams<TRecord> = {
      page: s.page,
      perPage: s.perPage,
      sort: s.sort,
      filter: s.filter,
      displayedFilters: s.displayedFilters,
    };
    kv.setItem(paramsKey, params);
  };

  /**
   * The ONLY path that reconfigures the observer — param-mutating actions.
   * Detached, the observer does not exist: state still updates and persists,
   * and the next attach rebuilds options from CURRENT state.
   */
  const applyParams = (
    patch: Partial<
      Pick<
        ListControllerState<TRecord>,
        "page" | "perPage" | "sort" | "filter" | "displayedFilters"
      >
    >,
  ): void => {
    store.setState(patch);
    persistParams();
    observer?.setOptions(buildOptions());
  };

  // --- actions ---
  const setPage = (page: number): void => {
    if (destroyed) return;
    applyParams({ page });
  };

  const setPerPage = (perPage: number): void => {
    if (destroyed) return;
    applyParams({ perPage, page: 1 });
  };

  const setSort = (
    input: SortPayload<TRecord> | SortPayload<TRecord>[],
  ): void => {
    if (destroyed) return;
    applyParams({
      sort: nextSortOf(store.getSnapshot().sort, input),
      page: 1,
    });
  };

  const applyFilters = (
    filter: FilterPayload<TRecord>,
    displayedFilters?: DisplayedFilters<TRecord>,
  ): void => {
    applyParams({
      filter: removeEmpty(filter),
      displayedFilters:
        displayedFilters === undefined
          ? store.getSnapshot().displayedFilters
          : { ...displayedFilters },
      page: 1,
    });
  };

  const setParams = (patch: ListParamsPatch<TRecord>): void => {
    if (destroyed) return;
    const next = listParamsFromPatch<TRecord>(patch);
    if (Object.keys(next).length === 0) return;
    // A debounced filter still pending would overwrite this patch's filter.
    if (patch.filter !== undefined) clearDebounce();
    applyParams(next);
  };

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingFilters:
    | {
        filter: FilterPayload<TRecord>;
        displayedFilters?: DisplayedFilters<TRecord>;
      }
    | undefined;
  const clearDebounce = (): void => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    pendingFilters = undefined;
  };
  store.onDestroy(clearDebounce);

  const setFilters = (
    filter: FilterPayload<TRecord>,
    displayedFilters?: DisplayedFilters<TRecord>,
    debounced = false,
  ): void => {
    if (destroyed) return;
    clearDebounce();
    if (!debounced) {
      applyFilters(filter, displayedFilters);
      return;
    }
    pendingFilters = { filter, displayedFilters };
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      pendingFilters = undefined;
      if (destroyed) return;
      applyFilters(filter, displayedFilters);
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  };

  const showFilter = (
    name: RecordFilterKey<TRecord>,
    defaultValue?: unknown,
  ): void => {
    if (destroyed) return;
    const s = store.getSnapshot();
    applyParams({
      // Keep the same filter reference when no default value is supplied.
      filter:
        defaultValue === undefined
          ? s.filter
          : removeEmpty({ ...s.filter, [name]: defaultValue }),
      displayedFilters: { ...s.displayedFilters, [name]: true },
    });
  };

  const hideFilter = (name: RecordFilterKey<TRecord>): void => {
    if (destroyed) return;
    const s = store.getSnapshot();
    // A debounced filter still pending would bring the removed value back, so
    // it lands now, minus the hidden filter, rather than being dropped.
    const pending = pendingFilters;
    clearDebounce();
    const filter = removeFilterPath(
      pending ? removeEmpty(pending.filter) : s.filter,
      name,
    );
    const displayedFilters = removeDisplayedFilter(
      pending?.displayedFilters ?? s.displayedFilters,
      name,
    );
    applyParams({
      filter,
      displayedFilters,
      ...(pending ? { page: 1 } : {}),
    });
  };

  // --- selection: KV-backed when available (cross-instance sync), else local ---
  const writeSelection = (ids: Identifier[]): void => {
    if (selectionKey && kv) {
      // Attached, the state update arrives through the KV subscription armed
      // in `acquire` (single path). Detached, that subscription is not armed —
      // mirror into local state directly so snapshots stay truthful.
      kv.setItem(selectionKey, ids);
      if (!observer) store.setState({ selectedIds: ids });
    } else {
      store.setState({ selectedIds: ids });
    }
  };

  const select = (ids: Identifier[]): void => {
    if (destroyed) return;
    writeSelection([...ids]);
  };

  const toggleItem = (id: Identifier): void => {
    if (destroyed) return;
    const current = store.getSnapshot().selectedIds;
    writeSelection(
      current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id],
    );
  };

  const unselectAll = (): void => {
    if (destroyed) return;
    writeSelection([]);
  };

  const selectAll = (opts?: { limit?: number }): Promise<void> =>
    runSelectAll(
      ctx.notifications,
      async (limit) => {
        const s = store.getSnapshot();
        const result = await ctx.queryClient.fetchQuery({
          ...getListOptions(ctx, resource, {
            pagination: { page: 1, perPage: limit },
            sort: s.sort.length === 1 ? s.sort[0] : s.sort,
            filter: { ...s.filter, ...(options.filter ?? {}) },
          }),
          retry: false,
        });
        return result.data;
      },
      writeSelection,
      () => destroyed,
      opts?.limit,
    );

  const refetch = (): void => {
    if (destroyed) return;
    // Detached there is no observer — refetch is a NO-OP by design; the next
    // attach refetches with current params anyway.
    void observer?.refetch();
  };

  // --- out-of-range page resets (recon rule 2) ---
  // Guarded by resetPageTarget: only a SETTLED result may trigger a reset, so
  // a reset-induced refetch (isFetching) can never re-trigger one — no ping-pong.
  const maybeResetPage = (): void => {
    const target = resetPageTarget(store.getSnapshot());
    if (target !== undefined) setPage(target);
  };

  // --- observer result -> state (the observer NEVER gets setOptions from here) ---
  const errors = createErrorAnnouncer(ctx.notifications);
  const onResult = (result: QueryObserverResult<ListResult, Error>): void => {
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
    if (result.error) errors.announce(result.error);
    else errors.rearm();
    maybeResetPage();
  };

  /**
   * Attach: runs on the micro-store's FIRST subscriber (hoisted into the
   * `createMicroStore` options above). Creates and subscribes the observer
   * with options built from CURRENT state, arms the KV selection sync, and
   * returns the teardown that the micro-store runs on last-unsubscribe AND
   * on destroy-while-attached.
   */
  function acquire(): () => void {
    const attached = new QueryObserver<ListResult, Error>(
      ctx.queryClient,
      buildOptions(),
    );
    observer = attached;
    const unsubscribeObserver = attached.subscribe(onResult);
    // Sync the optimistic first result (covers cached data + enabled: false).
    onResult(attached.getCurrentResult());
    let unsubscribeSelection: (() => void) | undefined;
    if (selectionKey && kv) {
      const syncKey = selectionKey;
      const syncSelection = (): void => {
        store.setState({
          selectedIds: kv.getItem<Identifier[]>(syncKey) ?? [],
        });
      };
      unsubscribeSelection = kv.subscribe(syncKey, syncSelection);
      // The selection may have moved (another instance/tab) while detached.
      syncSelection();
    }
    return () => {
      unsubscribeObserver();
      unsubscribeSelection?.();
      observer = null;
      clearDebounce();
    };
  }

  return {
    ...store,
    defaultPerPage: defaults.perPage,
    setPage,
    setPerPage,
    setSort,
    setFilters,
    setParams,
    showFilter,
    hideFilter,
    select,
    toggleItem,
    unselectAll,
    selectAll,
    refetch,
  };
}
