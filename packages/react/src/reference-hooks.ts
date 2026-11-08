import {
  createReferenceManyController,
  createReferenceOneController,
  type FilterPayload,
  getAtPath,
  type Identifier,
  type ListControllerContext,
  type ListControllerState,
  type LooseRecord,
  listControllerActions,
  type MicroStore,
  type RecordOf,
  type ReferenceManyController,
  type ReferenceOneController,
  type ReferenceOneControllerState,
  type ResourceMap,
  type ResourceRecord,
  type SortPayload,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useCheloneContext } from "./context";
import { toControllerContext } from "./controller-hooks";
import {
  type RecordContextValue,
  useRecordContext,
} from "./record/record-context";

/** Options both reference-field hooks share. */
interface ReferenceFieldControllerOptions<
  TName extends string,
  RecordType extends ResourceRecord = LooseRecord,
  ReferenceRecord = LooseRecord,
> {
  /** The resource whose rows point at the record. */
  reference: TName;
  /** The field on `reference` that holds the foreign key. A key of the referenced record. */
  target: SourceKey<ReferenceRecord>;
  /**
   * The field on the record whose value `target` must equal. Default `"id"`,
   * spelled out because `SourceProp<RecordType>` stays deferred while
   * `RecordType` is an unresolved parameter, so the compiler cannot see that
   * `"id"` is one of its paths.
   */
  source?: SourceProp<RecordType> | "id";
  /** Defaults to the ambient record (`useRecordContext`). */
  record?: RecordContextValue<RecordType>;
  /** Gates the data fetch only. Default true. */
  enabled?: boolean;
}

export interface UseReferenceManyFieldControllerOptions<
  TName extends string = string,
  RecordType extends ResourceRecord = LooseRecord,
  ReferenceRecord = LooseRecord,
> extends ReferenceFieldControllerOptions<TName, RecordType, ReferenceRecord> {
  /** Permanent filter, merged over the user filter for every fetch. Keyed by the referenced resource's record. */
  filter?: FilterPayload<ReferenceRecord>;
  /** Initial sort when nothing is persisted. Default id ascending. */
  sort?: SortPayload<ReferenceRecord> | SortPayload<ReferenceRecord>[];
  /** Default 25. */
  perPage?: number;
  /** KV namespace for params and selection. Default `${reference}.${target}.${id}`; `false` keeps them in memory. */
  storeKey?: string | false;
  /** Debounce delay in ms for `setFilters(..., debounced=true)`. Default 500. */
  debounce?: number;
}

export interface UseReferenceOneFieldControllerOptions<
  TName extends string = string,
  RecordType extends ResourceRecord = LooseRecord,
  ReferenceRecord = LooseRecord,
> extends ReferenceFieldControllerOptions<TName, RecordType, ReferenceRecord> {
  /** Decides which row is first when several match. */
  sort?: SortPayload<ReferenceRecord> | SortPayload<ReferenceRecord>[];
  /** Narrows the lookup. Keyed by the referenced resource's record. */
  filter?: FilterPayload<ReferenceRecord>;
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

/**
 * The foreign key `source` holds on the record, read through core's
 * {@link getAtPath} so `source="author.id"` resolves the way `ReferenceField`
 * reads it. Anything but a string or number reads as no key.
 */
function foreignKeyOf(
  record: RecordContextValue<ResourceRecord>,
  source: string,
): Identifier | undefined {
  const value = getAtPath(record, source);
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

/**
 * The bridge both hooks share: resolves the record's foreign key, holds one
 * inert controller per key, and binds the current one with
 * `useSyncExternalStore`.
 *
 * A new key builds a new controller in the render phase. Construction is inert,
 * so a discarded render leaves only garbage; `setHeld` during render is React's
 * documented way to derive state from props, and React re-renders at once with
 * the new controller. `useSyncExternalStore` then moves its subscription over
 * and the old controller releases on its last unsubscribe. No destroy effect,
 * for the reason `useListController` gives.
 */
function useReferenceFieldBridge<
  TResources extends ResourceMap,
  TState,
  TController extends MicroStore<TState>,
  RecordType extends ResourceRecord,
>(
  options: ReferenceFieldControllerOptions<string, RecordType>,
  create: (
    ctx: ListControllerContext<TResources>,
    id: Identifier | undefined,
  ) => TController,
): { controller: TController; snapshot: TState } {
  const ctx = useCheloneContext<TResources>();
  const record = useRecordContext<RecordType>({ record: options.record });
  const id = foreignKeyOf(record, options.source ?? "id");

  const [held, setHeld] = useState(() => ({
    id,
    controller: create(toControllerContext(ctx), id),
  }));
  let controller = held.controller;
  if (!Object.is(held.id, id)) {
    controller = create(toControllerContext(ctx), id);
    setHeld({ id, controller });
  }

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return { controller, snapshot };
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
  RecordType extends ResourceRecord = LooseRecord,
>(
  options: UseReferenceManyFieldControllerOptions<
    TName,
    RecordType,
    RecordOf<TResources, TName>
  >,
): UseReferenceManyFieldControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const { controller, snapshot } = useReferenceFieldBridge<
    TResources,
    ListControllerState<TRecord>,
    ReferenceManyController<TRecord>,
    RecordType
  >(options, (ctx, id) =>
    createReferenceManyController(ctx, options.reference, {
      target: options.target,
      id,
      filter: options.filter,
      sort: options.sort,
      perPage: options.perPage,
      storeKey: options.storeKey,
      debounceMs: options.debounce,
      enabled: options.enabled,
    }),
  );

  return useMemo(
    () => ({
      ...snapshot,
      ...listControllerActions(controller),
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
  RecordType extends ResourceRecord = LooseRecord,
>(
  options: UseReferenceOneFieldControllerOptions<
    TName,
    RecordType,
    RecordOf<TResources, TName>
  >,
): UseReferenceOneFieldControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const { controller, snapshot } = useReferenceFieldBridge<
    TResources,
    ReferenceOneControllerState<TRecord>,
    ReferenceOneController<TRecord>,
    RecordType
  >(options, (ctx, id) =>
    createReferenceOneController(ctx, options.reference, {
      target: options.target,
      id,
      sort: options.sort,
      filter: options.filter,
      enabled: options.enabled,
    }),
  );

  return useMemo(
    () => ({ ...snapshot, refetch: controller.refetch }),
    [snapshot, controller],
  );
}
