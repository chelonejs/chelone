<script setup lang="ts">
import {
  BooleanField,
  DataTable,
  DataTableCol,
  FilterList,
  FilterListItem,
  List,
  SavedQueriesList,
} from "@chelone/vue";
</script>

<template>
  <!-- Pick a publication filter, then save it under a name to bring it back with one click. -->
  <List :per-page="5">
    <FilterList label="Publication">
      <FilterListItem label="Published" :value="{ published: true }" />
      <FilterListItem label="Draft" :value="{ published: false }" />
    </FilterList>
    <SavedQueriesList />
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableCol source="published">
        <BooleanField source="published" />
      </DataTableCol>
    </DataTable>
  </List>
</template>
