<script setup lang="ts">
/**
 * The preview's fakeDataProvider matches a filter value exactly, and `q` is a
 * full-text filter, so this list runs client-side, where `q` has its match.
 * `useList` builds it and `provideListContext` publishes it, the Vue analog of
 * React's `<ListContextProvider>`.
 */
import {
  DataTable,
  DataTableCol,
  FilterLiveSearch,
  provideListContext,
  useList,
} from "@chelone/vue";

const posts = [
  { id: 1, title: "On Computable Numbers" },
  { id: 2, title: "Notes on the Analytical Engine" },
  { id: 3, title: "The Genesis of the Compiler" },
  { id: 4, title: "Debugging a Moth" },
  { id: 5, title: "The Imitation Game Revisited" },
];

provideListContext(useList({ data: posts, perPage: posts.length }));
</script>

<template>
  <!-- A search box that filters posts as the reader types. -->
  <FilterLiveSearch placeholder="Search posts" />
  <DataTable :row-click="false">
    <DataTableCol source="title" />
  </DataTable>
</template>
