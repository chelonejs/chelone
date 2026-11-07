<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { CronField, provideRecordContext } from "@chelone/vue";

provideRecordContext({ id: 1, schedule: "0 9 * * 1-5" });
</script>

<template>
  <!-- `<CronField>` describes a weekday schedule at 9 AM and shows its cron expression. -->
  <CronField source="schedule" show-expression />
</template>
