<script setup lang="ts">
import {
  BooleanField,
  DataTable,
  DataTableCol,
  List,
  ToggleFilterButton,
} from "@chelone/vue";
</script>

<template>
  <!-- A button that toggles the post list between all posts and published posts. -->
  <List :per-page="5">
    <template #actions>
      <ToggleFilterButton label="Published" :value="{ published: true }" />
    </template>
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableCol source="published">
        <BooleanField source="published" />
      </DataTableCol>
    </DataTable>
  </List>
</template>
