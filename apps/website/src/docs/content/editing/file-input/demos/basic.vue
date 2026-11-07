<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { FileInput } from "@chelone/vue";
</script>

<template>
  <!-- `<FileInput>` shows an empty drop zone that accepts several PDF files. -->
  <!-- The native `<input type="file">` speaks the `accept` string form, not the React twin's object form. -->
  <FileInput source="attachments" multiple accept="application/pdf" />
</template>
