<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { ArrayInput, TextInput } from "@chelone/vue";

const tags = [{ name: "Science" }, { name: "Computing" }];
</script>

<template>
  <!-- `<ArrayInput>` edits embedded tags with controls to add, remove, and reorder rows. Its default slot is the row template, so no separate iterator is needed. -->
  <ArrayInput source="tags" :default-value="tags">
    <TextInput source="name" label="Tag" />
  </ArrayInput>
</template>
