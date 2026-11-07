<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
  ListToolbar,
  TextInput,
} from "@chelone/vue";

const filters = [
  { source: "q", label: "Search", component: TextInput, alwaysOn: true },
];
</script>

<template>
  <!-- `<ListToolbar>` puts a search filter beside create and export actions. -->
  <List :per-page="5">
    <template #actions>
      <ListToolbar :filters="filters" />
    </template>
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
    </DataTable>
  </List>
</template>
