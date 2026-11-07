<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { DateTimeInput } from "@chelone/vue";
</script>

<template>
  <!-- `<DateTimeInput>` shows a native date and time picker set to 14 March 2026 at 09:30. -->
  <DateTimeInput source="starts_at" default-value="2026-03-14T09:30" />
</template>
