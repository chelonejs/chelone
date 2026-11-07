<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { ColorInput } from "@chelone/vue";
</script>

<template>
  <!-- `<ColorInput>` picks a color from the browser's picker or a preset swatch. -->
  <ColorInput
    source="color"
    default-value="#3b82f6"
    :swatches="['#3b82f6', '#22c55e', '#f97316']"
  />
</template>
