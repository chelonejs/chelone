<script lang="ts">
import type {
  FilterPayload,
  LooseRecord,
  SortPayload,
  SourceProp,
} from "@chelone/core";

/** Props for {@link ArrayField}. */
export interface ArrayFieldProps {
  /** The field path to the array on the current record. */
  source: SourceProp;
  /** The record to read. Defaults to the ambient `RecordContext` value. */
  record?: LooseRecord;
  /** Returned when the resolved value is `undefined`. */
  defaultValue?: unknown;
  /** Client-side page size for the embedded list. */
  perPage?: number;
  /** Client-side sort for the embedded list. */
  sort?: SortPayload;
  /** Client-side filter for the embedded list. */
  filter?: FilterPayload;
}
</script>

<script setup lang="ts">
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

import type { ResourceRecord } from "@chelone/core";
import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { provideListContext } from "../../../list/list-context";
import { useList } from "../../../list/use-list";

const props = defineProps<ArrayFieldProps>();

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const data = computed<ResourceRecord[]>(() =>
  Array.isArray(value.value) ? (value.value as ResourceRecord[]) : [],
);

const listContext = useList({
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
