<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { DurationField, provideRecordContext } from "@chelone/vue";

// A duration of two hours and thirty minutes.
provideRecordContext({ id: 1, duration: "PT2H30M" });
</script>

<template>
  <!-- `<DurationField>` displays it as `2h 30m`. -->
  <DurationField source="duration" />
</template>
