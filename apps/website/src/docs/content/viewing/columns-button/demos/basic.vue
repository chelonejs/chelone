<script setup lang="ts">
import {
  BooleanField,
  ColumnsButton,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- `<ColumnsButton>` lets you show, hide and reorder the post table's columns. The menu opens on click. -->
  <List :per-page="5">
    <template #actions>
      <ColumnsButton />
    </template>
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
      <DataTableCol source="published">
        <BooleanField source="published" />
      </DataTableCol>
    </DataTable>
  </List>
</template>
