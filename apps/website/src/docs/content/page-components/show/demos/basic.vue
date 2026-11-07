<script setup lang="ts">
/**
 * `<Show>` — the Vue twin of `basic.tsx`: each `<RecordField>` labels and
 * renders one field of the fetched record, reading it straight from the record
 * context. The record id is passed explicitly (no route param in the preview).
 */
import {
  BooleanField,
  NumberField,
  RecordField,
  ReferenceField,
  Show,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <Show :id="1">
    <RecordField source="title" />
    <RecordField source="body" />
    <RecordField label="Author">
      <ReferenceField source="author_id" reference="authors">
        <TextField source="name" />
      </ReferenceField>
    </RecordField>
    <RecordField label="Views">
      <NumberField source="views" />
    </RecordField>
    <RecordField label="Published">
      <BooleanField source="published" />
    </RecordField>
  </Show>
</template>
