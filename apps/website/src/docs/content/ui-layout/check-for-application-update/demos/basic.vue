<script setup lang="ts">
import { CheckForApplicationUpdate } from "@chelone/vue";
</script>

<template>
  <!-- `<CheckForApplicationUpdate>` renders nothing while the deployed page is unchanged, so `disabled` keeps this static preview from polling at all. The note beside it sits in a column, which is what centres it in the panel. -->
  <div class="flex flex-col items-center gap-2">
    <CheckForApplicationUpdate disabled />
    <p class="text-sm text-muted-foreground">The application is up to date.</p>
  </div>
</template>
