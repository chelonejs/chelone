<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { ResettableTextInput } from "@chelone/vue";
</script>

<template>
  <!-- `<ResettableTextInput>` shows a clear button beside a title that already has a value. -->
  <div class="w-full max-w-sm">
    <ResettableTextInput source="title" default-value="On Computable Numbers" />
  </div>
</template>
