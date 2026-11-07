<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { CronInput } from "@chelone/vue";
</script>

<template>
  <!-- `<CronInput>` holds `0 9 * * 1-5` and describes the schedule beneath the field. -->
  <CronInput source="schedule" default-value="0 9 * * 1-5" />
</template>
