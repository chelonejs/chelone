<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  FilterButton,
  FilterForm,
  List,
  TextInput,
} from "@chelone/vue";

const filters = [{ source: "title", label: "Title", component: TextInput }];
</script>

<template>
  <!-- An Add filter menu that reveals a title input above the post list. -->
  <List :per-page="5">
    <template #actions>
      <FilterForm :filters="filters" />
      <FilterButton :filters="filters" />
    </template>
    <DataTable>
      <DataTableCol source="title" />
    </DataTable>
  </List>
</template>
