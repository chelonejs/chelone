<script lang="ts">
import type {
  FilterPayload,
  LooseRecord,
  SortPayload,
} from "@chelone/core";

/** Props for {@link ReferenceManyField}. */
export interface ReferenceManyFieldProps {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: string;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: LooseRecord;
  /** Sort applied to the related list. */
  sort?: SortPayload;
  /** Permanent filter merged into the reference lookup. */
  filter?: FilterPayload;
  /** Page size for the related list. */
  perPage?: number;
}
</script>

<script setup lang="ts">
/**
 * `<ReferenceManyField>` — displays multiple related records that reference the
 * current record via a foreign key (a one-to-many / reverse relationship). The
 * Vue port of `@chelone/react`'s `fields/reference-many-field.tsx`. Fetches the
 * records of `reference` whose `target` equals the current record's id (or
 * `source`), drops them in a `ListContext`, publishes the reference resource,
 * and renders its default slot.
 *
 * Rebridge note (mirrors the React twin): chelone has no `ReferenceManyFieldBase`
 * — the reverse relation resolves via `useGetList({ filter: { [target]: id } })`
 * plus client-side `useList` + `provideListContext`.
 */

import type { Identifier, ResourceRecord } from "@chelone/core";
import { computed, inject } from "vue";
import { useGetList } from "../../../data/queries";
import { RecordContextKey } from "../../../record/record-context";
import { provideListContext } from "../../../list/list-context";
import { provideResourceContext } from "../../../resource-context";
import { useList } from "../../../list/use-list";

const props = defineProps<ReferenceManyFieldProps>();

// Inject the record ref directly (not `useRecordContext`, which reads once) so
// the field re-resolves when an async record lands. A `record` prop wins.
const injectedRecord = inject(RecordContextKey, null);
const record = computed(() => props.record ?? injectedRecord?.value);

const id = computed(
  () => record.value?.[props.source ?? "id"] as Identifier | undefined,
);

const query = useGetList(
  props.reference,
  () => ({
    filter: { ...props.filter, [props.target]: id.value },
    sort: props.sort,
    pagination: props.perPage ? { page: 1, perPage: props.perPage } : undefined,
  }),
  { enabled: () => id.value != null },
);

const listContext = useList({
  data: () =>
    (id.value != null
      ? (query.data.value?.data ?? undefined)
      : []) as ResourceRecord[] | undefined,
  isPending: () => (id.value != null ? query.isPending.value : false),
  isFetching: () => (id.value != null ? query.isFetching.value : false),
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
