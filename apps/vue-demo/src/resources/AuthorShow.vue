<script setup lang="ts">
/**
 * `<AuthorShow>` — the read-only author page, the Vue twin of `apps/demo`'s
 * `AuthorShow`. The email shows twice: as a mailto link inside a labeled
 * `<RecordField>`, and as plain text.
 */

import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  EmailField,
  RecordField,
  ReferenceManyField,
  Show,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <Show resource="authors">
    <div class="flex flex-col gap-4 max-w-xl">
      <RecordField source="name" />
      <RecordField label="Email">
        <EmailField source="email" />
      </RecordField>
      <TextField source="email" />
      <RecordField label="Posts">
        <ReferenceManyField reference="posts" target="author_id" :per-page="5">
          <DataTable :row-click="false">
            <DataTableCol source="title" />
            <DataTableNumberCol source="views" label="Views" />
          </DataTable>
        </ReferenceManyField>
      </RecordField>
    </div>
  </Show>
</template>
