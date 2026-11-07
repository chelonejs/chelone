<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { TextArrayInput } from "@chelone/vue";
</script>

<template>
  <!-- `<TextArrayInput>` shows "react" and "typescript" as removable tags beside a field for typing more. -->
  <div class="w-full max-w-sm">
    <TextArrayInput
      source="keywords"
      :default-value="['react', 'typescript']"
    />
  </div>
</template>
