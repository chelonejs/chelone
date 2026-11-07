<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { CheckboxGroupInput } from "@chelone/vue";

const choices = [
  { id: "science", name: "Science" },
  { id: "computing", name: "Computing" },
  { id: "history", name: "History" },
];
</script>

<template>
  <!-- `<CheckboxGroupInput>` selects several tags from a short list of checkboxes. -->
  <CheckboxGroupInput
    source="tags"
    :default-value="['science']"
    :choices="choices"
  />
</template>
