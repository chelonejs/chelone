<script lang="ts">
import type { FilterPayload, LooseRecord } from "@chelone/core";

/** Props for {@link ReferenceManyCount}. */
export interface ReferenceManyCountProps {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: string;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: LooseRecord;
  /** Permanent filter merged into the lookup, so only matching rows are counted. */
  filter?: FilterPayload;
  /** Shown while the count is loading. Nothing by default. */
  loading?: string;
  /** Shown when the lookup rejects. Nothing by default. */
  error?: string;
  /** A class name applied to the count's `<span>`. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ReferenceManyCount>` — how many rows of `reference` point back at the
 * current record, without loading them. The Vue port of `@chelone/react`'s
 * `fields/reference-many-count.tsx`. Reads the `total` of a one-row
 * `getManyReference` page. Renders nothing (and fetches nothing) without a
 * record id, and nothing when the provider returns no `total`; a `0` total
 * renders as `0`. No `link` prop and no number formatting.
 */

import type { Identifier } from "@chelone/core";
import { computed, inject } from "vue";
import { foreignKeyOf } from "../../../controllers/use-controller-for-id";
import { useGetManyReference } from "../../../data/queries";
import { RecordContextKey } from "../../../record/record-context";

const props = defineProps<ReferenceManyCountProps>();

// Read through `props` and the ambient ref inside a computed, so a `record`
// prop or an async ambient record lands live.
const ambient = inject(RecordContextKey, null);
const id = computed(() =>
  foreignKeyOf(props.record ?? ambient?.value, props.source ?? "id"),
);

const query = useGetManyReference(
  props.reference,
  () => ({
    target: props.target,
    id: id.value as Identifier,
    pagination: { page: 1, perPage: 1 },
    filter: props.filter,
  }),
  { enabled: () => id.value != null },
);
const total = computed(() => query.data.value?.total);
</script>

<template>
  <template v-if="id == null" />
  <template v-else-if="query.isPending.value">{{ loading }}</template>
  <template v-else-if="query.error.value">{{ error }}</template>
  <template v-else-if="total == null" />
  <span v-else data-slot="reference-many-count" :class="props.class">{{
    total
  }}</span>
</template>
