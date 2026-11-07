<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  provideRecordContext,
  ReferenceManyField,
} from "@chelone/vue";

provideRecordContext({ id: 1, name: "Ada Lovelace" });
</script>

<template>
  <!-- `<ReferenceManyField>` lists the posts whose `author_id` points back at this author, one `getManyReference` page at a time. -->
  <ReferenceManyField
    reference="posts"
    target="author_id"
    :sort="{ field: 'views', order: 'DESC' }"
    :per-page="3"
  >
    <DataTable :pagination="false" :row-click="false">
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
    </DataTable>
  </ReferenceManyField>
</template>
