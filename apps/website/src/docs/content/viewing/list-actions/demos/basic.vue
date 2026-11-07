<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
  ListActions,
} from "@chelone/vue";
</script>

<template>
  <!-- `<ListActions>` offers create and export buttons above the posts. -->
  <List :per-page="5">
    <template #actions>
      <ListActions />
    </template>
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
    </DataTable>
  </List>
</template>
