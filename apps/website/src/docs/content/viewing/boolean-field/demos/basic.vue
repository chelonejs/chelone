<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
/**
 * `<BooleanField>` — the Vue twin of `basic.tsx`: the current post's published
 * flag as a check or cross.
 */
import { BooleanField } from "@chelone/vue";
</script>

<template>
  <BooleanField source="published" />
</template>
