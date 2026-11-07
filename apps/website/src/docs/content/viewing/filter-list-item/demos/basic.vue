<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  FilterList,
  FilterListItem,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- A Published filter that toggles on and off when clicked again. -->
  <List :per-page="5">
    <FilterList label="Publication">
      <FilterListItem label="Published" :value="{ published: true }" />
    </FilterList>
    <DataTable>
      <DataTableCol source="title" />
    </DataTable>
  </List>
</template>
