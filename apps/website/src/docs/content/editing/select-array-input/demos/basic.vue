<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { SelectArrayInput } from "@chelone/vue";

const tags = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];
</script>

<template>
  <!-- `<SelectArrayInput>` shows a "Tech" and "People" badge for the preselected tags and opens a checkbox list of all three. -->
  <div class="w-full max-w-sm">
    <SelectArrayInput
      source="tags"
      :choices="tags"
      :default-value="['tech', 'people']"
    />
  </div>
</template>
