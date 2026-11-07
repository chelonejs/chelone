<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { DateInput } from "@chelone/vue";
</script>

<template>
  <!-- `<DateInput>` shows a native date picker set to 2026-03-14. -->
  <DateInput source="published_at" default-value="2026-03-14" />
</template>
