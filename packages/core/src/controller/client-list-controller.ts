import { isFilterBranch } from "../data/filter-branch";
import { removeEmpty } from "../data/remove-empty";
import type { FilterPayload, SortPayload } from "../data/types";
import { getAtPath } from "../resource/get-at-path";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import { createMicroStore } from "../store/micro-store";
import {
  type ListController,
  type ListControllerState,
  type ListParamsPatch,
  listParamsFromPatch,
  removeFilterPath,
} from "./list-controller";

/**
 * Options for a client-side (in-memory) list controller — the vanilla engine
 * behind the React `useList` hook. Unlike {@link createListController}, this
 * NEVER touches a dataProvider: it filters/sorts/paginates the `data` array
 * supplied in props, matching ra-core's `useList` behavior.
 */
export interface ClientListControllerOptions<TRecord> {
  /** The in-memory records. `undefined` = not-yet-loaded (data/total stay undefined). */
  data?: TRecord[];
  /** Initial user filter. */
  filter?: FilterPayload<TRecord>;
  /** Initial sort. Single payload or an array (multi-sort is normalized to an array). */
  sort?: SortPayload | SortPayload[];
  /** Initial page (1-based). Default 1. */
  page?: number;
  /** Page size. Default 1000 (ra-core `useList` default — "show everything"). */
  perPage?: number;
  /** Pass-through loading flags for callers wiring an async source into a client list. */
  isPending?: boolean;
  isFetching?: boolean;
  /** Pass-through error. Default `null`. */
  error?: Error | null;
  /** Extra predicate applied AFTER the field filters (ra-core `filterCallback`). */
  filterCallback?: (record: TRecord) => boolean;
}

/**
 * A client-side {@link ListController} plus the two prop-reflection setters the
 * React bridge uses to push external `data` / `filter` prop changes without
 * remounting.
 */
/**
 * The subset of loading flags a caller may push from an async source (external
 * prop changes). Reflected into controller state, and `isPending` re-triggers
 * the derived-slice recompute (pending -> blanks data; resolved -> populates).
 */
export interface ClientListLoadingState {
  isPending?: boolean;
  isFetching?: boolean;
  error?: Error | null;
}

export interface ClientListController<TRecord> extends ListController<TRecord> {
  /** Replace the source records (external `data` prop change) and recompute. */
  setData(data: TRecord[] | undefined): void;
  /** Replace the user filter from the `filter` prop (external change) and recompute. */
  setSourceFilter(filter: FilterPayload<TRecord>): void;
  /**
   * Push external loading-flag changes (async source feeding a client list).
   * An `isPending` transition re-runs the derived-slice recompute so data
   * populates once the source resolves — the documented async-source path.
   */
  setLoadingState(patch: ClientListLoadingState): void;
}

const DEFAULT_PER_PAGE = 1000;
const DEFAULT_SORT: SortPayload[] = [];

function normalizeSort(
  sort: SortPayload | SortPayload[] | undefined,
): SortPayload[] {
  if (!sort) return DEFAULT_SORT.map((entry) => ({ ...entry }));
  const entries = Array.isArray(sort) ? sort : [sort];
  return entries.map((entry) => ({ ...entry }));
}

/**
 * Flatten a nested filter object into dotted keys (`{nested:{level:5}}` →
 * `{'nested.level':5}`), matching ra-core's `flattenObject`. Arrays and
 * non-plain values are treated as LEAVES (never recursed).
 */
function flattenFilter(
  filter: FilterPayload,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isFilterBranch(value)) {
      Object.assign(result, flattenFilter(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

/** Does one record satisfy every flattened filter entry (ra-core semantics)? */
function matchesFilter<TRecord>(
  record: TRecord,
  flatFilter: Record<string, unknown>,
): boolean {
  return Object.entries(flatFilter).every(([filterName, filterValue]) => {
    const recordValue = getAtPath(record, filterName);
    if (Array.isArray(recordValue)) {
      return Array.isArray(filterValue)
        ? recordValue.some((item) => filterValue.includes(item))
        : recordValue.includes(filterValue);
    }
    if (Array.isArray(filterValue)) {
      return filterValue.includes(recordValue);
    }
    if (filterName === "q") {
      // Special full-text filter: any string field contains the term.
      const needle = String(filterValue).toLowerCase();
      return Object.values(record as Record<string, unknown>).some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(needle),
      );
    }
    // Loose equality (ra-core parity: numeric-string filters match numbers).
    // biome-ignore lint/suspicious/noDoubleEquals: intentional ra-core loose match.
    return filterValue == recordValue;
  });
}

function applyFilterAndSort<TRecord>(
  records: TRecord[],
  filter: FilterPayload<TRecord>,
  sort: SortPayload[],
  filterCallback: (record: TRecord) => boolean,
): TRecord[] {
  let result = records;
  const flatFilter = flattenFilter(filter);
  if (Object.keys(flatFilter).length > 0) {
    result = result.filter((record) => matchesFilter(record, flatFilter));
  }
  result = result.filter(filterCallback);
  // Sort a COPY — never mutate the source array.
  const keys = sort.filter((entry) => entry.field);
  if (keys.length > 0) {
    result = [...result].sort((a, b) => {
      for (const { field, order } of keys) {
        const asc = order === "ASC";
        const av = getAtPath(a, field);
        const bv = getAtPath(b, field);
        if (av === bv || (av == null && bv == null)) continue;
        if (av == null) return asc ? -1 : 1;
        if (bv == null) return asc ? 1 : -1;
        if (av > bv) return asc ? 1 : -1;
        if (av < bv) return asc ? -1 : 1;
      }
      return 0;
    });
  }
  return result;
}

/**
 * Vanilla client-side list controller. Pure state + closures over a
 * {@link createMicroStore}; NO QueryObserver, NO subscriptions to acquire —
 * every derived value is recomputed synchronously from the current params +
 * source data. Selection is local (never KV-synced — an in-memory list has no
 * cross-instance identity).
 *
 * Shape parity: it satisfies {@link ListController} so the React `useList` hook
 * returns the SAME `UseListControllerResult` a `<ListContextProvider>` /
 * `useListContext` consumer already reads.
 */
export function createClientListController<
  TRecord extends ResourceRecord = ResourceRecord,
>(
  options: ClientListControllerOptions<TRecord>,
): ClientListController<TRecord> {
  const filterCallback =
    options.filterCallback ?? ((record: TRecord) => Boolean(record));

  // Mutable source of truth for the "input" side (data + params).
  let source: TRecord[] | undefined = options.data;

  const store = createMicroStore<ListControllerState<TRecord>>({
    page: options.page ?? 1,
    perPage: options.perPage ?? DEFAULT_PER_PAGE,
    sort: normalizeSort(options.sort),
    filter: removeEmpty(options.filter ?? {}),
    displayedFilters: {},
    selectedIds: [],
    data: undefined,
    total: undefined,
    pageInfo: undefined,
    isPending: options.isPending ?? false,
    isFetching: options.isFetching ?? false,
    error: options.error ?? null,
    hasNextPage: undefined,
    hasPreviousPage: undefined,
  });

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
  });

  /** Recompute the derived slice (data/total/paging flags) from source + params. */
  const recompute = (): void => {
    const s = store.getSnapshot();
    if (s.isPending || source === undefined) {
      store.setState({
        data: undefined,
        total: undefined,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      return;
    }
    const filteredAndSorted = applyFilterAndSort(
      source,
      s.filter,
      s.sort,
      filterCallback,
    );
    const total = filteredAndSorted.length;
    const lastPage = Math.max(Math.ceil(total / s.perPage), 1);
    const page = Math.min(Math.max(s.page, 1), lastPage);
    const start = (page - 1) * s.perPage;
    const paginated = filteredAndSorted.slice(start, start + s.perPage);
    store.setState({
      page,
      data: paginated,
      total,
      hasNextPage: page * s.perPage < total,
      hasPreviousPage: page > 1,
    });
  };

  // Seed the derived slice from the initial params.
  recompute();

  // --- param actions ---
  const setPage = (page: number): void => {
    if (destroyed) return;
    store.setState({ page });
    recompute();
  };

  const setPerPage = (perPage: number): void => {
    if (destroyed) return;
    store.setState({ perPage, page: 1 });
    recompute();
  };

  const setSort = (input: SortPayload | SortPayload[]): void => {
    if (destroyed) return;
    const current = store.getSnapshot().sort;
    const single = current.length === 1 ? current[0] : undefined;
    let next: SortPayload[];
    if (Array.isArray(input)) {
      next = input.map((entry) => ({ ...entry }));
    } else if (single && single.field === input.field) {
      next = [
        { field: input.field, order: single.order === "ASC" ? "DESC" : "ASC" },
      ];
    } else {
      next = [{ field: input.field, order: input.order ?? "ASC" }];
    }
    store.setState({ sort: next, page: 1 });
    recompute();
  };

  const setFilters = (
    filter: FilterPayload<TRecord>,
    displayedFilters?: Record<string, boolean>,
  ): void => {
    if (destroyed) return;
    store.setState({
      filter: removeEmpty(filter),
      displayedFilters:
        displayedFilters === undefined
          ? store.getSnapshot().displayedFilters
          : { ...displayedFilters },
      page: 1,
    });
    recompute();
  };

  const setParams = (patch: ListParamsPatch<TRecord>): void => {
    if (destroyed) return;
    const next = listParamsFromPatch<TRecord>(patch);
    if (Object.keys(next).length === 0) return;
    store.setState(next);
    recompute();
  };

  const showFilter = (name: string, defaultValue?: unknown): void => {
    if (destroyed) return;
    const s = store.getSnapshot();
    store.setState({
      filter:
        defaultValue === undefined
          ? s.filter
          : removeEmpty({ ...s.filter, [name]: defaultValue }),
      displayedFilters: { ...s.displayedFilters, [name]: true },
    });
    recompute();
  };

  const hideFilter = (name: string): void => {
    if (destroyed) return;
    const s = store.getSnapshot();
    const filter = removeFilterPath(s.filter, name);
    const { [name]: _shown, ...displayedFilters } = s.displayedFilters;
    store.setState({ filter, displayedFilters, page: 1 });
    recompute();
  };

  // --- selection (local — no KV) ---
  const select = (ids: Identifier[]): void => {
    if (destroyed) return;
    store.setState({ selectedIds: [...ids] });
  };

  const toggleItem = (id: Identifier): void => {
    if (destroyed) return;
    const current = store.getSnapshot().selectedIds;
    store.setState({
      selectedIds: current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id],
    });
  };

  const unselectAll = (): void => {
    if (destroyed) return;
    store.setState({ selectedIds: [] });
  };

  const selectAll = async (opts?: { limit?: number }): Promise<void> => {
    if (destroyed) return;
    if (source === undefined) return;
    const s = store.getSnapshot();
    const filteredAndSorted = applyFilterAndSort(
      source,
      s.filter,
      s.sort,
      filterCallback,
    );
    const limited =
      opts?.limit != null
        ? filteredAndSorted.slice(0, opts.limit)
        : filteredAndSorted;
    store.setState({ selectedIds: limited.map((record) => record.id) });
  };

  // refetch is a no-op for a client list — there is no source to re-fetch.
  const refetch = (): void => {};

  // --- prop reflection (React bridge pushes external prop changes) ---
  const setData = (data: TRecord[] | undefined): void => {
    if (destroyed) return;
    source = data;
    recompute();
  };

  const setSourceFilter = (filter: FilterPayload<TRecord>): void => {
    if (destroyed) return;
    store.setState({ filter: removeEmpty(filter), page: 1 });
    recompute();
  };

  const setLoadingState = (patch: ClientListLoadingState): void => {
    if (destroyed) return;
    const s = store.getSnapshot();
    const next: Partial<ListControllerState<TRecord>> = {};
    if (patch.isPending !== undefined && patch.isPending !== s.isPending) {
      next.isPending = patch.isPending;
    }
    if (patch.isFetching !== undefined && patch.isFetching !== s.isFetching) {
      next.isFetching = patch.isFetching;
    }
    if (patch.error !== undefined && patch.error !== s.error) {
      next.error = patch.error;
    }
    if (Object.keys(next).length === 0) return;
    // Land the flag patch in state BEFORE recompute — recompute reads
    // `isPending` from the snapshot, so it must see the new value.
    store.setState(next);
    // Only an isPending transition changes the derived slice (data blanks
    // while pending, repopulates once resolved). Skip the recompute otherwise.
    if (next.isPending !== undefined) recompute();
  };

  return {
    ...store,
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
    setData,
    setSourceFilter,
    setLoadingState,
  };
}
