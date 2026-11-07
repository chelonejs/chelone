<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { TimeInput } from "@chelone/vue";
</script>

<template>
  <!-- `<TimeInput>` shows a native time picker set to 09:30. -->
  <div class="w-full max-w-sm">
    <TimeInput source="opens_at" default-value="09:30" />
  </div>
</template>
