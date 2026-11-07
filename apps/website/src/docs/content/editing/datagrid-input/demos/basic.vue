<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { DatagridInput } from "@chelone/vue";

const categories = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];
</script>

<template>
  <!-- `<DatagridInput>` lists three categories as table rows with checkboxes; Tech starts selected. -->
  <DatagridInput
    source="category_ids"
    :choices="categories"
    option-text="name"
    :default-value="[1]"
  />
</template>
