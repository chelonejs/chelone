import {
  keepPreviousData,
  QueryObserver,
  type QueryObserverResult,
} from "@tanstack/query-core";
import {
  DEFAULT_DEBOUNCE_MS,
  notifyFetchError,
} from "../controller/list-controller";
import { DEFAULT_REFERENCE_PER_PAGE } from "../controller/reference-many-controller";
import {
  type DataContext,
  getListOptions,
  getManyOptions,
} from "../data/query-options";
import { removeEmpty } from "../data/remove-empty";
import type {
  FilterPayload,
  GetListResult,
  PageInfo,
  SortPayload,
} from "../data/types";
import type { NotificationStore } from "../notification/notification-store";
import type { Identifier } from "../resource/identifier";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type { SourceKey } from "../resource/source-path";
import { createMicroStore, type MicroStore } from "../store/micro-store";

/**
 * An erased choice record: choices carry arbitrary shapes (`{id, name, ...}`),
 * and an adapter's choice inputs are generic over one. Both adapters re-export
 * this as their own `ChoiceRecord`.
 */
// type-escape: a choice is any record shape; the caller's `TChoice` names it.
export type ChoiceRecord = Record<string, unknown>;

/**
 * The choices-context state (§0b parity). A list-like base (page/perPage/sort/
 * filter) plus a status union over three record views:
 * - `availableChoices` — the current fetched page (choices query only)
 * - `selectedChoices` — the records resolved for the current value(s)
 * - `allChoices` — the page with any MISSING selected records prepended
 *   (deduped by `lookupKey`), so a currently-selected value that is not on the
 *   page still renders as a labelled choice.
 */
export interface ChoicesControllerState<TRecord> {
  page: number;
  perPage: number;
  sort: SortPayload;
  /** The dynamic (user) filter — permanent filter is merged in on fetch. */
  filter: FilterPayload<TRecord>;
  /** All choices: page + missing selected prepended (deduped by lookupKey). */
  allChoices: TRecord[];
  /** The fetched page only. */
  availableChoices: TRecord[];
  /** Records resolved for the current value(s). */
  selectedChoices: TRecord[];
  /** `total` from the choices query, `+1` when a single selected record is missing from the page. */
  total: number | undefined;
  pageInfo: PageInfo | undefined;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: Error | null;
  /** The referenced resource name. */
  resource: string;
  /** The FK field on the referencing side (metadata for consumers). */
  source: string | undefined;
  /** Always `true` — distinguishes a reference-backed context from an inline-choices one. */
  isFromReference: true;
}

export interface ChoicesController<TRecord>
  extends MicroStore<ChoicesControllerState<TRecord>> {
  setPage(page: number): void;
  setPerPage(perPage: number): void;
  /** Replaces the sort and resets the page to 1. */
  setSort(sort: SortPayload): void;
  /** Sets the dynamic filter (`removeEmpty` applied). `debounce` delays by `debounceMs`. */
  setFilters(filter: FilterPayload<TRecord>, debounce?: boolean): void;
  /** Feeds the selected-record resolution. Scalar or array; `null`/`[]` clears. */
  setValue(value: unknown): void;
  refetch(): void;
}

export interface ChoicesControllerContext<
  TResources extends ResourceMap = ResourceMap,
> extends DataContext<TResources> {
  notifications?: NotificationStore;
  translate?: (key: string) => string;
}

export interface ChoicesControllerOptions<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
> {
  /** The referenced resource to fetch choices from. */
  reference: TName;
  /**
   * The field on the referenced record that the value matches.
   * `'id'` (default) resolves selected records via `getMany`; any other key
   * resolves via `getList({ filter: { [lookupKey]: value } })` (#16).
   */
  lookupKey?: SourceKey<RecordOf<TResources, TName>>;
  /** Permanent filter — merged OVER the dynamic filter for every choices fetch. */
  filter?: FilterPayload<RecordOf<TResources, TName>>;
  page?: number;
  perPage?: number;
  sort?: SortPayload;
  /** Gate the CHOICES query on the current filter values. Selected always resolves. */
  enableGetChoices?: (
    filterValues: FilterPayload<RecordOf<TResources, TName>>,
  ) => boolean;
  /** Debounce delay for `setFilters(..., true)`. Default 500ms. */
  debounceMs?: number;
  /** The FK source field on the referencing side (metadata only). */
  source?: string;
  meta?: unknown;
}

const DEFAULT_PAGE = 1;
const DEFAULT_SORT: SortPayload = { field: "id", order: "DESC" };
/** perPage for the non-id selected getList — generous, real values sets are small. */
const SELECTED_LIST_PER_PAGE = 1000;

/** Normalizes a value into a non-empty identifier list, or `[]` when there is nothing to resolve. */
function toValueList(value: unknown): Identifier[] {
  const raw = Array.isArray(value) ? value : [value];
  return raw.filter(
    (v): v is Identifier =>
      v != null && v !== "" && (typeof v === "string" || typeof v === "number"),
  );
}

/**
 * Vanilla choices controller: TWO QueryObservers (choices page + selected
 * resolution) mapped into one micro-store, closing charter §11 #16 — selected
 * records resolve by an arbitrary `lookupKey`, not just `id`.
 *
 * Lifecycle (P4 4R): construction is INERT — pure state + closures, zero
 * subscriptions, zero fetching. Acquisition (both observers + KV nothing) runs
 * on the micro-store's FIRST subscriber; the LAST unsubscribe releases both
 * observers and clears the debounce timer. Attach/detach cycles are
 * re-entrant; re-attach rebuilds both observers from CURRENT state.
 * `destroy()` remains the hard imperative teardown for non-React consumers.
 *
 * Loop-prevention: `observer.setOptions` is called ONLY from param-mutating
 * actions (`setPage`/`setSort`/`setFilters`/`setValue`), never from the
 * observer result subscription — the subscription only maps results into state.
 */
export function createChoicesController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: ChoicesControllerContext<TResources>,
  options: ChoicesControllerOptions<TResources, TName>,
): ChoicesController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type ListResult = GetListResult<TRecord>;

  const reference = options.reference;
  const lookupKey = options.lookupKey ?? "id";
  const isIdLookup = lookupKey === "id";
  const permanentFilter: FilterPayload<TRecord> = options.filter ?? {};
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const store = createMicroStore<ChoicesControllerState<TRecord>>(
    {
      page: options.page ?? DEFAULT_PAGE,
      perPage: options.perPage ?? DEFAULT_REFERENCE_PER_PAGE,
      sort: { ...(options.sort ?? DEFAULT_SORT) },
      filter: {},
      allChoices: [],
      availableChoices: [],
      selectedChoices: [],
      total: undefined,
      pageInfo: undefined,
      hasNextPage: undefined,
      hasPreviousPage: undefined,
      isPending: true,
      isFetching: false,
      error: null,
      resource: reference,
      source: options.source,
      isFromReference: true,
    },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
  });

  /** Non-null exactly while attached. */
  let choicesObserver: QueryObserver<ListResult, Error> | null = null;
  /** Selected observer: getMany (id) OR getList (non-id). Rebuilt on setValue. */
  let selectedObserver: QueryObserver<TRecord[] | ListResult, Error> | null =
    null;

  /** The value(s) currently driving selected resolution. */
  let selectedValues: Identifier[] = [];
  /** Latest raw fetch results, cached so `recompute()` can re-merge on any change. */
  let pageData: TRecord[] | undefined;
  let pageTotal: number | undefined;
  let pageInfo: PageInfo | undefined;
  let selectedData: TRecord[] = [];

  const isGetChoicesEnabled = (): boolean =>
    options.enableGetChoices
      ? options.enableGetChoices(store.getSnapshot().filter)
      : true;

  const buildChoicesOptions = () => {
    const s = store.getSnapshot();
    return {
      ...getListOptions(ctx, reference, {
        pagination: { page: s.page, perPage: s.perPage },
        sort: s.sort,
        filter: { ...s.filter, ...permanentFilter },
        meta: options.meta,
      }),
      placeholderData: keepPreviousData,
      retry: false,
      enabled: isGetChoicesEnabled(),
    };
  };

  /**
   * Options for the selected observer. `id` lookup batches through getMany;
   * any other key resolves through a getList filter (single OR array value).
   * Disabled when there is nothing to resolve so it never pins `isPending`.
   */
  const buildSelectedOptions = () => {
    const enabled = selectedValues.length > 0;
    if (isIdLookup) {
      return {
        ...getManyOptions(ctx, reference, {
          ids: selectedValues,
          meta: options.meta,
        }),
        retry: false,
        enabled,
      };
    }
    const filterValue =
      selectedValues.length === 1 ? selectedValues[0] : selectedValues;
    return {
      ...getListOptions(ctx, reference, {
        pagination: { page: 1, perPage: SELECTED_LIST_PER_PAGE },
        filter: { [lookupKey]: filterValue },
        meta: options.meta,
      }),
      retry: false,
      enabled,
    };
  };

  /** Records from the selected observer result, whichever shape it is. */
  const readSelectedData = (
    result: QueryObserverResult<TRecord[] | ListResult, Error>,
  ): TRecord[] => {
    const data = result.data;
    if (data == null) return [];
    return Array.isArray(data) ? data : data.data;
  };

  /**
   * Merge the page + selected records into the three views (§0b parity), then
   * write the derived state. Called from BOTH result subscriptions.
   */
  const recompute = (patch: {
    isPending: boolean;
    isFetching: boolean;
    error: Error | null;
  }): void => {
    const s = store.getSnapshot();
    const page = pageData ?? [];
    const selected = selectedData;

    // allChoices: page with any missing selected prepended, deduped by lookupKey.
    const keyOf = (record: TRecord): unknown => record[lookupKey];
    const pageKeys = new Set(page.map(keyOf));
    const missing = selected.filter((record) => !pageKeys.has(keyOf(record)));
    const allChoices = missing.length > 0 ? [...missing, ...page] : page;

    // total: +1 only when exactly one selected record is missing from the page
    // (ra parity: array/multi selection leaves the total unadjusted).
    let total = pageTotal;
    if (total !== undefined && missing.length === 1 && selected.length === 1) {
      total = total + 1;
    }

    let hasNextPage: boolean | undefined;
    let hasPreviousPage: boolean | undefined;
    if (pageInfo) {
      hasNextPage = pageInfo.hasNextPage;
      hasPreviousPage = pageInfo.hasPreviousPage;
    } else if (pageTotal !== undefined) {
      hasNextPage = s.page * s.perPage < pageTotal;
      hasPreviousPage = s.page > 1;
    }

    store.setState({
      allChoices,
      availableChoices: page,
      selectedChoices: selected,
      total,
      pageInfo,
      hasNextPage,
      hasPreviousPage,
      isPending: patch.isPending,
      isFetching: patch.isFetching,
      error: patch.error,
    });
  };

  let lastNotifiedError: Error | null = null;
  const notifyError = (error: Error | null): void => {
    if (error === lastNotifiedError) return;
    lastNotifiedError = error;
    if (error === null) return;
    notifyFetchError(ctx.notifications, error);
  };

  /**
   * The combined status union. `isPending` reflects the choices query and the
   * selected query ONLY when a value is being resolved — a valueless selected
   * query is disabled and must never pin `isPending` (§0b).
   */
  const onChoicesResult = (
    result: QueryObserverResult<ListResult, Error>,
  ): void => {
    const list = result.data;
    pageData = list?.data;
    pageTotal = list?.total;
    pageInfo = list?.pageInfo;
    const selectedPending =
      selectedValues.length > 0 && selectedObserver
        ? selectedObserver.getCurrentResult().isPending
        : false;
    const selectedFetching =
      selectedValues.length > 0 && selectedObserver
        ? selectedObserver.getCurrentResult().isFetching
        : false;
    const error =
      result.error ?? selectedObserver?.getCurrentResult().error ?? null;
    recompute({
      isPending: result.isPending || selectedPending,
      isFetching: result.isFetching || selectedFetching,
      error,
    });
    notifyError(result.error ?? null);
  };

  const onSelectedResult = (
    result: QueryObserverResult<TRecord[] | ListResult, Error>,
  ): void => {
    selectedData = readSelectedData(result);
    const choicesResult = choicesObserver?.getCurrentResult();
    const choicesPending = choicesResult?.isPending ?? false;
    const choicesFetching = choicesResult?.isFetching ?? false;
    const selectedPending = selectedValues.length > 0 && result.isPending;
    const selectedFetching = selectedValues.length > 0 && result.isFetching;
    const error = choicesResult?.error ?? result.error ?? null;
    recompute({
      isPending: choicesPending || selectedPending,
      isFetching: choicesFetching || selectedFetching,
      error,
    });
  };

  // --- actions (the ONLY paths that call setOptions) ---
  const setPage = (page: number): void => {
    if (destroyed) return;
    store.setState({ page });
    choicesObserver?.setOptions(buildChoicesOptions());
  };

  const setPerPage = (perPage: number): void => {
    if (destroyed) return;
    store.setState({ perPage, page: 1 });
    choicesObserver?.setOptions(buildChoicesOptions());
  };

  const setSort = (sort: SortPayload): void => {
    if (destroyed) return;
    store.setState({ sort: { ...sort }, page: 1 });
    choicesObserver?.setOptions(buildChoicesOptions());
  };

  const applyFilters = (filter: FilterPayload<TRecord>): void => {
    store.setState({ filter: removeEmpty(filter), page: 1 });
    choicesObserver?.setOptions(buildChoicesOptions());
  };

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const clearDebounce = (): void => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  };
  store.onDestroy(clearDebounce);

  const setFilters = (
    filter: FilterPayload<TRecord>,
    debounce = false,
  ): void => {
    if (destroyed) return;
    clearDebounce();
    if (!debounce) {
      applyFilters(filter);
      return;
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      if (destroyed) return;
      applyFilters(filter);
    }, debounceMs);
  };

  const setValue = (value: unknown): void => {
    if (destroyed) return;
    const next = toValueList(value);
    // Skip a redundant rebuild when the value set is unchanged.
    if (
      next.length === selectedValues.length &&
      next.every((v, i) => v === selectedValues[i])
    ) {
      return;
    }
    selectedValues = next;
    if (next.length === 0) {
      selectedData = [];
    }
    selectedObserver?.setOptions(buildSelectedOptions());
    // Detached, there is no observer — recompute so a cleared value drops
    // stale selected records from the snapshot immediately.
    if (!selectedObserver && next.length === 0) {
      recompute({
        isPending: store.getSnapshot().isPending,
        isFetching: store.getSnapshot().isFetching,
        error: store.getSnapshot().error,
      });
    }
  };

  const refetch = (): void => {
    if (destroyed) return;
    void choicesObserver?.refetch();
    if (selectedValues.length > 0) void selectedObserver?.refetch();
  };

  /**
   * Attach: runs on the micro-store's FIRST subscriber. Creates and subscribes
   * BOTH observers with options built from CURRENT state, and returns the
   * teardown the micro-store runs on last-unsubscribe AND destroy-while-attached.
   */
  function acquire(): () => void {
    const choices = new QueryObserver<ListResult, Error>(
      ctx.queryClient,
      buildChoicesOptions(),
    );
    choicesObserver = choices;
    const selected = new QueryObserver<TRecord[] | ListResult, Error>(
      ctx.queryClient,
      buildSelectedOptions(),
    );
    selectedObserver = selected;

    const unsubChoices = choices.subscribe(onChoicesResult);
    const unsubSelected = selected.subscribe(onSelectedResult);
    // Sync the optimistic first results (cached data + enabled:false paths).
    onSelectedResult(selected.getCurrentResult());
    onChoicesResult(choices.getCurrentResult());

    return () => {
      unsubChoices();
      unsubSelected();
      choicesObserver = null;
      selectedObserver = null;
      clearDebounce();
    };
  }

  return {
    ...store,
    setPage,
    setPerPage,
    setSort,
    setFilters,
    setValue,
    refetch,
  };
}

/** The three choice views of a state, erased to `ChoiceRecord[]`. */
export interface ChoiceLists {
  allChoices: ChoiceRecord[];
  availableChoices: ChoiceRecord[];
  selectedChoices: ChoiceRecord[];
}

/**
 * The state's three choice views as the erased lists an adapter's
 * `ChoicesContextValue` carries — the one place a record becomes a
 * `ChoiceRecord`, so neither adapter writes the cast. The arrays are the
 * state's own, not copies.
 */
export function choiceListsOf<TRecord>(
  state: ChoicesControllerState<TRecord>,
): ChoiceLists {
  const { allChoices, availableChoices, selectedChoices } = state;
  // type-escape: `RecordOf` cannot be proved a `ChoiceRecord` while it is generic.
  return { allChoices, availableChoices, selectedChoices } as ChoiceLists;
}
