<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
/**
 * `<NumberField>` — the Vue twin of `basic.tsx`: a post's view count formatted
 * in the US English locale.
 */
import { NumberField } from "@chelone/vue";
</script>

<template>
  <NumberField source="views" locales="en-US" />
</template>
