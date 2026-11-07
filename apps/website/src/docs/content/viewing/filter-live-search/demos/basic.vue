<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  FilterLiveSearch,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- A search box that filters posts as the reader types. -->
  <List :per-page="5">
    <FilterLiveSearch placeholder="Search posts" />
    <DataTable>
      <DataTableCol source="title" />
    </DataTable>
  </List>
</template>
