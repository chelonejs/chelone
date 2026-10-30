<script setup lang="ts">
/**
 * `<ReferenceField>` — follows a foreign key to a related record and displays
 * it. The Vue analog of `@chelone/react`'s `fields/reference-field.tsx`. Reads
 * the FK at `source` off the ambient record, fetches the referenced record with
 * `useGetManyAggregate` (vue-query, enabled only when the FK is present), and renders
 * either the default slot (against the referenced record's `RecordContext`) or —
 * with no slot — the reference's record representation.
 *
 * Rebridge note (mirrors the React twin): Chelone carries no
 * `ReferenceFieldBase` stack — this field resolves the single record directly
 * with `useGetManyAggregate` and publishes it via `provideRecordContext`. Linking to the
 * referenced record's page is deferred to a later wave (the V1 vertical only
 * needs the resolved representation).
 */

import type { Identifier, LooseRecord } from "@chelone/core";
import { computed, provide, ref, watch } from "vue";
import { useGetManyAggregate } from "../../../data/queries";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import {
  RecordContextKey,
  type RecordValue,
} from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";

const props = defineProps<{
  source: string;
  reference: string;
  record?: LooseRecord;
  empty?: string;
}>();

const fk = useFieldValue({ source: props.source, record: props.record });
const id = computed(() => fk.value as Identifier | null | undefined);

const query = useGetManyAggregate(
  props.reference,
  () => ({ ids: id.value != null ? [id.value] : [] }),
  { enabled: () => id.value != null },
);

const referenceRecord = computed(
  () => query.data.value?.[0] as LooseRecord | undefined,
);

// Publish the referenced record so a default-slot child field reads it.
const recordRef = ref<RecordValue>(referenceRecord.value);
watch(referenceRecord, (next) => {
  recordRef.value = next;
});
provide(RecordContextKey, recordRef);

const getRepresentation = useGetRecordRepresentation(props.reference);
const representation = computed(() =>
  referenceRecord.value ? getRepresentation(referenceRecord.value) : null,
);
</script>

<template>
  <template v-if="id == null">
    <span v-if="empty" data-slot="reference-field">{{ empty }}</span>
  </template>
  <template v-else-if="query.isPending.value" />
  <template v-else-if="referenceRecord">
    <slot>
      <span data-slot="reference-field">{{ representation }}</span>
    </slot>
  </template>
  <template v-else>
    <span v-if="empty" data-slot="reference-field">{{ empty }}</span>
  </template>
</template>
