<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
/**
 * `<RecordField>` — the Vue twin of `basic.tsx`: a label above one value.
 * `source` reads it off the record, `field` renders it through another field,
 * and the default slot renders inside the label. A bare field wrapper reads the
 * ambient record.
 */
import { BooleanField, NumberField, RecordField } from "@chelone/vue";
</script>

<template>
  <div class="flex flex-col gap-3">
    <RecordField source="title" label="Title" />
    <RecordField source="views" label="Views" :field="NumberField" />
    <RecordField label="Published" variant="inline">
      <BooleanField source="published" />
    </RecordField>
  </div>
</template>
