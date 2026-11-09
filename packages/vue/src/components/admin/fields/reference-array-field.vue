<script
  lang="ts"
  generic="
    RecordType extends ResourceRecord = LooseRecord,
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
import type {
  FilterPayload,
  LooseRecord,
  RegisteredResources,
  ResourceMap,
  ResourceRecord,
  SortPayload,
  SourceProp,
} from "@chelone/core";

/** Props for {@link ReferenceArrayField}. */
export interface ReferenceArrayFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string
> {
  /** The FK-array field on the current record (e.g. `"tag_ids"`). */
  source: SourceProp<RecordType>;
  /** The referenced resource the ids point at (e.g. `"tags"`). A registered resource name. */
  reference: TReference;
  /** The record to read the FK array off. Defaults to the ambient record. */
  record?: RecordType;
  /** Client-side sort for the resolved list. */
  sort?: SortPayload;
  /** Client-side filter for the resolved list. */
  filter?: FilterPayload;
  /** Client-side page size for the resolved list. */
  perPage?: number;
}
</script>

<script
  setup
  lang="ts"
  generic="
    RecordType extends ResourceRecord = LooseRecord,
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
/**
 * `<ReferenceArrayField>` — displays multiple related records by following an
 * array of foreign keys. The Vue port of `@chelone/react`'s
 * `fields/reference-array-field.tsx`. Reads the id array at `source`, fetches the
 * referenced records with `useGetManyAggregate`, drops them in a client-side `ListContext`,
 * publishes the reference resource, and renders its default slot.
 *
 * Rebridge note (mirrors the React twin): chelone has no `ReferenceArrayFieldBase`
 * — composes `useFieldValue` + `useGetManyAggregate` + client-side `useList` +
 * `provideListContext` + `provideResourceContext`.
 */

import { identifiersOf } from "@chelone/core";
import { computed } from "vue";
import { useGetManyAggregate } from "../../../data/queries";
import { useFieldValue } from "../../../record/use-field-value";
import { provideListContext } from "../../../list/list-context";
import { provideResourceContext } from "../../../resource-context";
import { useList } from "../../../list/use-list";

const props = defineProps<
  ReferenceArrayFieldProps<RecordType, TResources, TReference>
>();

const value = useFieldValue({ source: props.source, record: props.record });

// The FK array read. A partially valid array (a nullable int[] reads as
// `[1, null, 2]`) keeps the ids it has, as it did before the guard.
const ids = computed(() => identifiersOf(value.value));

const query = useGetManyAggregate(
  props.reference,
  () => ({ ids: ids.value }),
  { enabled: () => ids.value.length > 0 },
);

// Only "pending" while a non-empty fetch is in flight; an empty FK array
// resolves to an empty list synchronously.
const listContext = useList({
  data: () => (ids.value.length > 0 ? (query.data.value ?? undefined) : []),
  isPending: () => (ids.value.length > 0 ? query.isPending.value : false),
  isFetching: () => (ids.value.length > 0 ? query.isFetching.value : false),
  error: () => query.error.value,
  sort: props.sort,
  filter: props.filter,
  perPage: props.perPage,
});

provideResourceContext(props.reference);
provideListContext(listContext);
</script>

<template>
  <slot />
</template>
