<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  List,
  ListPagination,
} from "@chelone/vue";
</script>

<template>
  <!-- `<ListPagination>` pages through posts and changes the number of visible rows. -->
  <!-- `<DataTable>` pages on its own unless `pagination` is off; off here so the demo shows the `<ListPagination>` it documents. -->
  <List :per-page="5">
    <DataTable :pagination="false" :row-click="false">
      <DataTableCol source="title" />
    </DataTable>
    <ListPagination :rows-per-page-options="[5, 10, 25]" />
  </List>
</template>
