<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
/**
 * `<NumberInput>` — the Vue twin of `basic.tsx`: a post's view count as a
 * number, floored at zero and filled with 137.
 */
import { NumberInput } from "@chelone/vue";
</script>

<template>
  <div class="w-full max-w-xs">
    <NumberInput source="views" :min="0" :step="10" :default-value="137" />
  </div>
</template>
