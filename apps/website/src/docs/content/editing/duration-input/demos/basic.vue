<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { DurationInput } from "@chelone/vue";
</script>

<template>
  <!-- `<DurationInput>` splits `P1DT2H30M` across day, hour, minute and second boxes. -->
  <DurationInput source="duration" default-value="P1DT2H30M" />
</template>
