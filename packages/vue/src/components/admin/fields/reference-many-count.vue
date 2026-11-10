<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type {
  FilterPayload,
  LooseRecord,
  ResourceRecord,
  SourceProp,
} from "@chelone/core";

/** Props for {@link ReferenceManyCount}. */
export interface ReferenceManyCountProps<RecordType extends ResourceRecord = LooseRecord> {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: SourceProp<RecordType>;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
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

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<ReferenceManyCount>` — how many rows of `reference` point back at the
 * current record, without loading them. The Vue port of `@chelone/react`'s
 * `fields/reference-many-count.tsx`. Reads the `total` of a one-row
 * `getManyReference` page. Renders nothing (and fetches nothing) without a
 * record id, and nothing when the provider returns no `total`; a `0` total
 * renders as `0`. No `link` prop and no number formatting.
 */

import { getAtPath, isIdentifier } from "@chelone/core";
import { computed } from "vue";
import { useGetManyReference } from "../../../data/queries";
import { useRecordContextRef } from "../../../record/record-context";

const props = defineProps<ReferenceManyCountProps<RecordType>>();

// The `"id"` default is a legal path of every Chelone record, but
// `SourceProp<RecordType>` is deferred while `RecordType` is an unresolved
// parameter, so the default reads the record's own `id` instead of a path. With
// a `source` the read is core's `getAtPath`, the one `useFieldValue` makes, and
// the getter keeps a `record` prop live over the ambient ref. The guard below is
// what makes the value an id.
const row = useRecordContextRef(() => props.record);
const foreignKey = computed(() =>
  props.source === undefined ? row.value?.id : getAtPath(row.value, props.source),
);
const id = computed(() =>
  isIdentifier(foreignKey.value) ? foreignKey.value : undefined,
);

const query = useGetManyReference(
  props.reference,
  () => ({
    target: props.target,
    // Never sent: the query is disabled without an id.
    id: id.value ?? "",
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
