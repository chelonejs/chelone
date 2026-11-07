<script setup lang="ts">
import { DataTable, DataTableCol, DataTableNumberCol, List } from "@chelone/vue";
import { CsvImport } from "@chelone/vue/csv-import";
import { z } from "zod";

const postImportSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});
</script>

<template>
  <!-- `<CsvImport>` opens a sheet that maps a CSV file's columns to a post's title and body, previews the rows that pass, and creates them. The sheet opens on click. -->
  <List :per-page="5">
    <template #actions>
      <CsvImport :schema="postImportSchema" />
    </template>
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
    </DataTable>
  </List>
</template>
