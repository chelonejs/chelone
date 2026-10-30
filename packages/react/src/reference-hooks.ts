import {
  createReferenceManyController,
  createReferenceOneController,
  type FilterPayload,
  type Identifier,
  type ListControllerState,
  type MicroStore,
  type RecordOf,
  type ReferenceManyController,
  type ReferenceOneController,
  type ReferenceOneControllerState,
  type ResourceMap,
  type SortPayload,
} from "@chelone/core";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useCheloneContext } from "./context";
import { toControllerContext } from "./controller-hooks";
import {
  type RecordContextValue,
  useRecordContext,
} from "./record/record-context";

/** Options both reference-field hooks share. */
interface ReferenceFieldControllerOptions<TName extends string> {
  /** The resource whose rows point at the record. */
  reference: TName;
  /** The field on `reference` that holds the foreign key. */
  target: string;
  /** The field on the record whose value `target` must equal. Default `"id"`. */
  source?: string;
  /** Defaults to the ambient record (`useRecordContext`). */
  record?: RecordContextValue;
  /** Gates the data fetch only. Default true. */
  enabled?: boolean;
}

export interface UseReferenceManyFieldControllerOptions<
  TName extends string = string,
> extends ReferenceFieldControllerOptions<TName> {
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
}

export interface UseReferenceOneFieldControllerOptions<
  TName extends string = string,
> extends ReferenceFieldControllerOptions<TName> {
  /** Decides which row is first when several match. */
  sort?: SortPayload | SortPayload[];
  /** Narrows the lookup. */
  filter?: FilterPayload;
}

/** Reactive controller state plus the controller's stable actions; drops into a list context. */
export type UseReferenceManyFieldControllerResult<TRecord> =
  ListControllerState<TRecord> &
    Omit<
      ReferenceManyController<TRecord>,
      keyof MicroStore<ListControllerState<TRecord>>
    >;

/** Reactive lookup state plus the controller's stable `refetch`. */
export type UseReferenceOneFieldControllerResult<TRecord> =
  ReferenceOneControllerState<TRecord> &
    Omit<
      ReferenceOneController<TRecord>,
      keyof MicroStore<ReferenceOneControllerState<TRecord>>
    >;

/** The value `source` names on the record, read as a foreign-key id. */
function sourceId(
  record: RecordContextValue,
  source: string,
): Identifier | null | undefined {
  return (record as Record<string, unknown> | undefined)?.[source] as
    | Identifier
    | null
    | undefined;
}

/**
 * Holds one inert controller per id. A new id builds a new controller in the
 * render phase (construction is inert, so a discarded render leaves only
 * garbage); `useSyncExternalStore` then moves its subscription over and the
 * old controller releases on its last unsubscribe. No destroy effect, for the
 * reason `useListController` gives.
 */
function useControllerForId<TController>(
  id: Identifier | null | undefined,
  create: (id: Identifier | null | undefined) => TController,
): TController {
  const [held, setHeld] = useState(() => ({ id, controller: create(id) }));
  if (Object.is(held.id, id)) return held.controller;
  const next = { id, controller: create(id) };
  setHeld(next);
  return next.controller;
}

/**
 * React bridge for the vanilla reference-many controller: the rows of
 * `reference` whose `target` equals `record[source]`, paged by the server.
 *
 * Follows `useListController`'s binding pattern. Only the resolved id is
 * live: when it changes (a record that arrives late or is swapped) a new
 * controller is built for it. The other options are read at mount and on that
 * rebuild; remount with a `key` to change them otherwise. There is no
 * location sync: the list is embedded in a record.
 */
export function useReferenceManyFieldController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseReferenceManyFieldControllerOptions<TName>,
): UseReferenceManyFieldControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const record = useRecordContext({ record: options.record });
  const id = sourceId(record, options.source ?? "id");

  const controller = useControllerForId<ReferenceManyController<TRecord>>(
    id,
    (value) =>
      createReferenceManyController(
        toControllerContext(ctx),
        options.reference,
        {
          target: options.target,
          id: value,
          filter: options.filter,
          sort: options.sort,
          perPage: options.perPage,
          storeKey: options.storeKey,
          debounceMs: options.debounce,
          enabled: options.enabled,
        },
      ),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

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

/**
 * React bridge for the vanilla reference-one controller: the first row of
 * `reference` whose `target` equals `record[source]`. Rebuilds for a new id the
 * same way {@link useReferenceManyFieldController} does.
 */
export function useReferenceOneFieldController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseReferenceOneFieldControllerOptions<TName>,
): UseReferenceOneFieldControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const record = useRecordContext({ record: options.record });
  const id = sourceId(record, options.source ?? "id");

  const controller = useControllerForId<ReferenceOneController<TRecord>>(
    id,
    (value) =>
      createReferenceOneController(
        toControllerContext(ctx),
        options.reference,
        {
          target: options.target,
          id: value,
          sort: options.sort,
          filter: options.filter,
          enabled: options.enabled,
        },
      ),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({ ...snapshot, refetch: controller.refetch }),
    [snapshot, controller],
  );
}
