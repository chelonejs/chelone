<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { TextInput } from "@chelone/vue";
</script>

<template>
  <!-- `<TextInput>` shows a labelled "Title" field filled with the post's title. -->
  <div class="w-full max-w-sm">
    <TextInput source="title" default-value="On Computable Numbers" />
  </div>
</template>
