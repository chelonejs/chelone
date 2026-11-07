<script setup lang="ts">
/**
 * The preview's fakeDataProvider matches a filter value exactly, and `q` is a
 * full-text filter, so this list runs client-side, where `q` has its match.
 * `useList` builds it and `provideListContext` publishes it, the Vue analog of
 * React's `<ListContextProvider>`; `<FilterForm>` is the live form around the
 * input, as Vue has no separate `FilterLiveForm`.
 */
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  FilterForm,
  provideListContext,
  SearchInput,
  useList,
} from "@chelone/vue";

const posts = [
  { id: 1, title: "On Computable Numbers", views: 50 },
  { id: 2, title: "Notes on the Analytical Engine", views: 187 },
  { id: 3, title: "The Genesis of the Compiler", views: 324 },
  { id: 4, title: "Debugging a Moth", views: 461 },
  { id: 5, title: "The Imitation Game Revisited", views: 598 },
];

provideListContext(useList({ data: posts, perPage: posts.length }));
</script>

<template>
  <!-- `<SearchInput>` narrows the table below it as the reader types: `q` searches every text field. -->
  <FilterForm>
    <SearchInput source="q" />
  </FilterForm>
  <DataTable :row-click="false">
    <DataTableCol source="title" />
    <DataTableNumberCol source="views" />
  </DataTable>
</template>
