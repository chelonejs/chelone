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
  type DisplayedFilters,
  type FilterPayload,
  type Identifier,
  type ListControllerState,
  type ListParamsPatch,
  type LooseRecord,
  type MicroStore,
  type RecordFilterKey,
  type RecordOf,
  type ReferenceManyController,
  type ResourceMap,
  type ResourceRecord,
  type SortPayload,
  type SourceKey,
} from "@chelone/core";
import { computed, inject, reactive, toValue } from "vue";
import { useCheloneContext } from "../context";
import { RecordContextKey } from "../record/record-context";
import { toControllerContext } from "./controller-context";
import type { ReferenceFieldControllerOptions } from "./reference-field-options";
import { foreignKeyOf, useControllerForId } from "./use-controller-for-id";

export interface UseReferenceManyFieldControllerOptions<
  TName extends string = string,
  RecordType extends ResourceRecord = LooseRecord,
  ReferenceRecord = LooseRecord,
> extends ReferenceFieldControllerOptions<TName, RecordType> {
  /** The field on `reference` that holds the foreign key. A key of the referenced record. */
  target: SourceKey<ReferenceRecord>;
  /** Permanent filter, merged over the user filter for every fetch. */
  filter?: FilterPayload<ReferenceRecord>;
  /** Initial sort when nothing is persisted. Default id ascending. */
  sort?: SortPayload<ReferenceRecord> | SortPayload<ReferenceRecord>[];
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

/**
 * The rows of `reference` whose `target` equals `record[source]`, paged by the
 * server. Returns a reactive view of the controller state plus its stable
 * actions. A record without a usable id (absent, or not a string or number)
 * fetches nothing and reads as an empty, settled list.
 */
export function useReferenceManyFieldController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
  RecordType extends ResourceRecord = LooseRecord,
>(
  options: UseReferenceManyFieldControllerOptions<
    TName,
    RecordType,
    RecordOf<TResources, TName>
  >,
): UseReferenceManyFieldControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const ambient = inject(RecordContextKey, null);
  const controllerCtx = toControllerContext(ctx);
  const source = options.source ?? "id";
  const id = computed(() =>
    foreignKeyOf(toValue(options.record) ?? ambient?.value, source),
  );

  const bound = useControllerForId<
    ListControllerState<TRecord>,
    ReferenceManyController<TRecord>
  >(id, (value) =>
    createReferenceManyController(controllerCtx, options.reference, {
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
  const controller = () => bound.value.controller;

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
    setPage: (page: number) => controller().setPage(page),
    setPerPage: (perPage: number) => controller().setPerPage(perPage),
    setSort: (sort: SortPayload<TRecord> | SortPayload<TRecord>[]) =>
      controller().setSort(sort),
    setFilters: (
      filter: FilterPayload<TRecord>,
      displayedFilters?: DisplayedFilters<TRecord>,
      debounced?: boolean,
    ) => controller().setFilters(filter, displayedFilters, debounced),
    setParams: (patch: ListParamsPatch<TRecord>) =>
      controller().setParams(patch),
    showFilter: (name: RecordFilterKey<TRecord>, defaultValue?: unknown) =>
      controller().showFilter(name, defaultValue),
    hideFilter: (name: RecordFilterKey<TRecord>) =>
      controller().hideFilter(name),
    select: (ids: Identifier[]) => controller().select(ids),
    toggleItem: (itemId: Identifier) => controller().toggleItem(itemId),
    unselectAll: () => controller().unselectAll(),
    selectAll: (options?: { limit?: number }) =>
      controller().selectAll(options),
    refetch: () => controller().refetch(),
  });
}
