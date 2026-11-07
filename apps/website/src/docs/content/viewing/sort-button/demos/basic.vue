<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
  SortButton,
} from "@chelone/vue";
</script>

<template>
  <!-- A menu that sorts posts by title or view count. -->
  <List :per-page="5">
    <template #actions>
      <SortButton :fields="['title', 'views']" label="Sort by {field} ({order})" />
    </template>
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
    </DataTable>
  </List>
</template>
