<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { TextField } from "@chelone/vue";
</script>

<template>
  <!-- A read-only field reads the ambient record — no props beyond `source`. -->
  <!-- `<TextField>` renders the current record's `title`. -->
  <TextField source="title" />
</template>
