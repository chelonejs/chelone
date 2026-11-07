<script setup lang="ts">
import {
  BooleanField,
  DataTable,
  DataTableCol,
  FilterList,
  FilterListItem,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- Publication filters that narrow the post list with one click. -->
  <List :per-page="5">
    <FilterList label="Publication">
      <FilterListItem label="Published" :value="{ published: true }" />
      <FilterListItem label="Draft" :value="{ published: false }" />
    </FilterList>
    <DataTable>
      <DataTableCol source="title" />
      <DataTableCol source="published">
        <BooleanField source="published" />
      </DataTableCol>
    </DataTable>
  </List>
</template>
