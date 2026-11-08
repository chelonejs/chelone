/**
 * `useReferenceOneFieldController` — the Vue bridge for the vanilla core
 * reference-one controller, the twin of `@chelone/react`'s hook of the same
 * name (`reference-hooks.ts`): the first row of `reference` whose `target`
 * equals `record[source]`, read through `getManyReference` as a page of one.
 *
 * `record` resolves and rebuilds the same way as
 * {@link useReferenceManyFieldController}: a new id builds a new controller and
 * releases the previous subscription.
 */

import {
  createReferenceOneController,
  type FilterPayload,
  type LooseRecord,
  type MicroStore,
  type RecordOf,
  type ReferenceOneController,
  type ReferenceOneControllerState,
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

export interface UseReferenceOneFieldControllerOptions<
  TName extends string = string,
  RecordType extends ResourceRecord = LooseRecord,
  ReferenceRecord = LooseRecord,
> extends ReferenceFieldControllerOptions<TName, RecordType> {
  /** The field on `reference` that holds the foreign key. A key of the referenced record. */
  target: SourceKey<ReferenceRecord>;
  /** Decides which row is first when several match. */
  sort?: SortPayload<ReferenceRecord> | SortPayload<ReferenceRecord>[];
  /** Narrows the lookup. */
  filter?: FilterPayload<ReferenceRecord>;
}

/** Live lookup state plus the controller's stable `refetch`. */
export type UseReferenceOneFieldControllerReturn<TRecord> =
  ReferenceOneControllerState<TRecord> &
    Omit<
      ReferenceOneController<TRecord>,
      keyof MicroStore<ReferenceOneControllerState<TRecord>>
    >;

/**
 * The first row of `reference` whose `target` equals `record[source]`. A record
 * without a usable id fetches nothing and reads as settled with no record.
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
): UseReferenceOneFieldControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const ambient = inject(RecordContextKey, null);
  const controllerCtx = toControllerContext(ctx);
  const source = options.source ?? "id";
  const id = computed(() =>
    foreignKeyOf(toValue(options.record) ?? ambient?.value, source),
  );

  const bound = useControllerForId<
    ReferenceOneControllerState<TRecord>,
    ReferenceOneController<TRecord>
  >(id, (value) =>
    createReferenceOneController(controllerCtx, options.reference, {
      target: options.target,
      id: value,
      sort: options.sort,
      filter: options.filter,
      enabled: options.enabled,
    }),
  );

  const state = computed(() => bound.value.state.value);

  return reactive({
    referenceRecord: computed(() => state.value.referenceRecord),
    isPending: computed(() => state.value.isPending),
    isFetching: computed(() => state.value.isFetching),
    error: computed(() => state.value.error),
    refetch: () => bound.value.controller.refetch(),
  }) as UseReferenceOneFieldControllerReturn<TRecord>;
}
