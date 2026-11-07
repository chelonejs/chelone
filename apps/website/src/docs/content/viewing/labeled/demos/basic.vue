<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { Labeled, TextField } from "@chelone/vue";
</script>

<template>
  <!-- `<Labeled>` adds a title label above a post's text field. -->
  <Labeled>
    <TextField source="title" />
  </Labeled>
</template>
