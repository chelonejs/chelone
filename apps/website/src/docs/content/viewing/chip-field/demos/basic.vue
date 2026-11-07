<script setup lang="ts">
import { ChipField } from "@chelone/vue";

const post = { id: 1, category: "Science" };
</script>

<template>
  <!-- `<ChipField>` shows a post's category as a compact chip. -->
  <ChipField source="category" :record="post" />
</template>
