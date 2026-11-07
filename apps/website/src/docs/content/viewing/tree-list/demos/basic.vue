<script setup lang="ts">
import { provideListContext, TreeList, useList } from "@chelone/vue";

const categories = [
  { id: 1, name: { en: "Electronics" }, parent_id: null },
  { id: 2, name: { en: "Computers" }, parent_id: 1 },
  { id: 3, name: { en: "Laptops" }, parent_id: 2 },
  { id: 4, name: { en: "Audio" }, parent_id: 1 },
  { id: 5, name: { en: "Books" }, parent_id: null },
  { id: 6, name: { en: "Fiction" }, parent_id: 5 },
];

// `useList` makes a list from an array; `provideListContext` is what React's `<ListContextProvider>` does.
provideListContext(useList({ data: categories }));
</script>

<template>
  <!-- Categories nested by `parent_id`. A branch opens with its chevron or the arrow keys. -->
  <TreeList
    parent-source="parent_id"
    title-source="name.en"
    :link-type="false"
    default-expanded
  />
</template>
