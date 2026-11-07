<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { RadioButtonGroupInput } from "@chelone/vue";

const categories = [
  { id: "computing", name: "Computing" },
  { id: "history", name: "History" },
  { id: "biography", name: "Biography" },
];
</script>

<template>
  <!-- `<RadioButtonGroupInput>` lays the three categories out as radio buttons, "Computing" checked. -->
  <div class="w-full max-w-xs">
    <RadioButtonGroupInput
      source="category"
      :choices="categories"
      default-value="computing"
    />
  </div>
</template>
