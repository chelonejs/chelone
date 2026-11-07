<script setup lang="ts">
/**
 * `<PostShow>` — the read-only post page, the Vue twin of `apps/demo`'s
 * `PostShow`. `<Show>` fetches the record and publishes it so each
 * `<RecordField>` can label a display field: the author resolves through a
 * `<ReferenceField>`, views through a `<NumberField>`.
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
  <Show resource="posts">
    <div class="flex flex-col gap-4 max-w-xl">
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
    </div>
  </Show>
</template>
