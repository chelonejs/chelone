<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  FilterForm,
  List,
  TextInput,
} from "@chelone/vue";

const filters = [
  { source: "q", label: "Search", component: TextInput, alwaysOn: true },
  { source: "title", label: "Title", component: TextInput, alwaysOn: true },
];
</script>

<template>
  <!-- A `<List>` whose toolbar holds a `<FilterForm>` with two always-on text filters. -->
  <List>
    <template #actions>
      <FilterForm :filters="filters" />
    </template>
    <DataTable>
      <DataTableCol source="title" />
    </DataTable>
  </List>
</template>
