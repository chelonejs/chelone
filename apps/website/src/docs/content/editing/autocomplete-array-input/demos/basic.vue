<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { AutocompleteArrayInput } from "@chelone/vue";

const tags = ["science"];
const choices = [
  { id: "science", name: "Science" },
  { id: "computing", name: "Computing" },
  { id: "history", name: "History" },
];
</script>

<template>
  <!-- `<AutocompleteArrayInput>` searches tags and displays selected values as removable badges. -->
  <AutocompleteArrayInput
    source="tags"
    :default-value="tags"
    :choices="choices"
  />
</template>
