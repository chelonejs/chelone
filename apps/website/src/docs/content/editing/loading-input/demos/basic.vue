<script setup lang="ts">
import { LoadingInput } from "@chelone/vue";
</script>

<template>
  <!-- `<LoadingInput>` shows a disabled, labelled placeholder input with a loading spinner. -->
  <LoadingInput label="Author" :timeout="0" />
</template>
