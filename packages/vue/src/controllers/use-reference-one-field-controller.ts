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
  type MicroStore,
  type RecordOf,
  type ReferenceOneController,
  type ReferenceOneControllerState,
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

export interface UseReferenceOneFieldControllerOptions<
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
  /** Decides which row is first when several match. */
  sort?: SortPayload | SortPayload[];
  /** Narrows the lookup. */
  filter?: FilterPayload;
  /** Gates the fetch. Default true. */
  enabled?: boolean;
}

/** Live lookup state plus the controller's stable `refetch`. */
export type UseReferenceOneFieldControllerReturn<TRecord> =
  ReferenceOneControllerState<TRecord> &
    Omit<
      ReferenceOneController<TRecord>,
      keyof MicroStore<ReferenceOneControllerState<TRecord>>
    >;

export function useReferenceOneFieldController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseReferenceOneFieldControllerOptions<TName>,
): UseReferenceOneFieldControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const ambient = inject(RecordContextKey, null);
  const source = options.source ?? "id";
  const id = computed(() =>
    sourceId(toValue(options.record) ?? ambient?.value, source),
  );

  const bound = useControllerForId<
    ReferenceOneControllerState<TRecord>,
    ReferenceOneController<TRecord>
  >(id, (value) =>
    createReferenceOneController(toControllerContext(ctx), options.reference, {
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
