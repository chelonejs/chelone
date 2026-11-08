<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type {
  FilterPayload,
  LooseRecord,
  ResourceRecord,
  SortPayload,
  SourceProp,
  SourceValue,
} from "@chelone/core";

/** Props for {@link ArrayField}. */
export interface ArrayFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  /** The field path to the array on the current record. */
  source: SourceProp<RecordType>;
  /** The record to read. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;
  /** Returned when the resolved value is `undefined`. */
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /** Client-side page size for the embedded list. */
  perPage?: number;
  /** Client-side sort for the embedded list. */
  sort?: SortPayload;
  /** Client-side filter for the embedded list. */
  filter?: FilterPayload;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<ArrayField>` — reads an array-valued `source` off the ambient record, drops
 * it into a client-side `ListContext` (no dataProvider), and renders its default
 * slot. The Vue port of `@chelone/react`'s `fields/array-field.tsx`. A
 * list-rendering child (a `<DataTable>`, a `SingleFieldList`) reads each array
 * item as a row via `useListContext`. Missing / empty array → an empty list.
 *
 * Rebridge note (mirrors the React twin): composes `useFieldValue` +
 * client-side `useList` + `provideListContext` — the SAME in-memory list engine
 * (`createClientListController`) the React twin uses, 1:1.
 */

import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { provideListContext } from "../../../list/list-context";
import { useList } from "../../../list/use-list";

const props = defineProps<ArrayFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const data = computed<LooseRecord[]>(() =>
  Array.isArray(value.value) ? value.value : [],
);

const listContext = useList<LooseRecord>({
  data: () => data.value,
  perPage: props.perPage,
  sort: props.sort,
  filter: props.filter,
});

provideListContext(listContext);
</script>

<template>
  <slot />
</template>
