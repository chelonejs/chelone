/**
 * `useReferenceManyFieldController` — the Vue bridge for the vanilla core
 * reference-many controller, the twin of `@chelone/react`'s hook of the same
 * name (`reference-hooks.ts`): the rows of `reference` whose `target` equals
 * `record[source]`, paged by the server through `getManyReference`.
 *
 * `record` is the `record` option when given, else the ambient record
 * (`RecordContextKey`). Only the resolved id is live: when it changes (a record
 * that arrives late or is swapped) a new controller is built for it and the
 * previous subscription is released. The other options are read at `setup`.
 * There is no location sync: the list is embedded in a record.
 */

import {
  createReferenceManyController,
  type FilterPayload,
  type ListControllerState,
  type MicroStore,
  type RecordOf,
  type ReferenceManyController,
  type ResourceMap,
  type SortPayload,
} from "@chelone/core";
import {
  computed,
  inject,
  type MaybeRefOrGetter,
  reactive,
  toValue,
} from "vue";
import { useCheloneContext } from "../context";
import { RecordContextKey, type RecordValue } from "../record/record-context";
import { toControllerContext } from "./controller-context";
import { sourceId, useControllerForId } from "./use-controller-for-id";

export interface UseReferenceManyFieldControllerOptions<
  TName extends string = string,
> {
  /** The resource whose rows point at the record. */
  reference: TName;
  /** The field on `reference` that holds the foreign key. */
  target: string;
  /** The field on the record whose value `target` must equal. Default `"id"`. */
  source?: string;
  /** Defaults to the ambient record. */
  record?: MaybeRefOrGetter<RecordValue>;
  /** Permanent filter, merged over the user filter for every fetch. */
  filter?: FilterPayload;
  /** Initial sort when nothing is persisted. Default id ascending. */
  sort?: SortPayload | SortPayload[];
  /** Default 25. */
  perPage?: number;
  /** KV namespace for params and selection. Default `${reference}.${target}.${id}`; `false` keeps them in memory. */
  storeKey?: string | false;
  /** Debounce delay in ms for `setFilters(..., debounced=true)`. Default 500. */
  debounce?: number;
  /** Gates the data fetch only. Default true. */
  enabled?: boolean;
}

/** Live controller state plus the controller's stable actions; the shape a list context publishes. */
export type UseReferenceManyFieldControllerReturn<TRecord> =
  ListControllerState<TRecord> &
    Omit<
      ReferenceManyController<TRecord>,
      keyof MicroStore<ListControllerState<TRecord>>
    >;

export function useReferenceManyFieldController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseReferenceManyFieldControllerOptions<TName>,
): UseReferenceManyFieldControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const ambient = inject(RecordContextKey, null);
  const source = options.source ?? "id";
  const id = computed(() =>
    sourceId(toValue(options.record) ?? ambient?.value, source),
  );

  const bound = useControllerForId<
    ListControllerState<TRecord>,
    ReferenceManyController<TRecord>
  >(id, (value) =>
    createReferenceManyController(toControllerContext(ctx), options.reference, {
      target: options.target,
      id: value,
      filter: options.filter,
      sort: options.sort,
      perPage: options.perPage,
      storeKey: options.storeKey,
      debounceMs: options.debounce,
      enabled: options.enabled,
    }),
  );

  const state = computed(() => bound.value.state.value);
  // Actions delegate to the current controller, so their identities survive a rebuild.
  const action = <TKey extends keyof ReferenceManyController<TRecord>>(
    key: TKey,
  ) =>
    ((...args: unknown[]) =>
      (bound.value.controller[key] as (...a: unknown[]) => unknown)(
        ...args,
      )) as ReferenceManyController<TRecord>[TKey];

  return reactive({
    data: computed(() => state.value.data),
    total: computed(() => state.value.total),
    pageInfo: computed(() => state.value.pageInfo),
    isPending: computed(() => state.value.isPending),
    isFetching: computed(() => state.value.isFetching),
    error: computed(() => state.value.error),
    page: computed(() => state.value.page),
    perPage: computed(() => state.value.perPage),
    sort: computed(() => state.value.sort),
    filter: computed(() => state.value.filter),
    displayedFilters: computed(() => state.value.displayedFilters),
    selectedIds: computed(() => state.value.selectedIds),
    hasNextPage: computed(() => state.value.hasNextPage),
    hasPreviousPage: computed(() => state.value.hasPreviousPage),
    setPage: action("setPage"),
    setPerPage: action("setPerPage"),
    setSort: action("setSort"),
    setFilters: action("setFilters"),
    setParams: action("setParams"),
    showFilter: action("showFilter"),
    hideFilter: action("hideFilter"),
    select: action("select"),
    toggleItem: action("toggleItem"),
    unselectAll: action("unselectAll"),
    selectAll: action("selectAll"),
    refetch: action("refetch"),
  }) as UseReferenceManyFieldControllerReturn<TRecord>;
}
