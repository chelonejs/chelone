<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
/**
 * `<SelectInput>` — the Vue twin of `basic.tsx`: a "Published" dropdown that
 * opens a list of the three statuses.
 */
import { SelectInput } from "@chelone/vue";

const statuses = [
  { id: "draft", name: "Draft" },
  { id: "published", name: "Published" },
  { id: "archived", name: "Archived" },
];
</script>

<template>
  <div class="w-full max-w-sm">
    <SelectInput source="status" :choices="statuses" default-value="published" />
  </div>
</template>
