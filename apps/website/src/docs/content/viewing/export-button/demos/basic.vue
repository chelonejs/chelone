<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  ExportButton,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- A post list with a button that downloads the records as CSV. -->
  <List :per-page="5">
    <template #actions>
      <ExportButton />
    </template>
    <DataTable>
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
    </DataTable>
  </List>
</template>
