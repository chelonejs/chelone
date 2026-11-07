<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { DateField } from "@chelone/vue";

const record = { id: 1, published_at: "2026-06-23" };
</script>

<template>
  <!-- `<DateField>` formats a post's publication date. -->
  <DateField source="published_at" :record="record" />
</template>
