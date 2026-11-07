<script setup lang="ts">
import { TextArrayField } from "@chelone/vue";

const post = { id: 1, tags: ["Science", "Computing"] };
</script>

<template>
  <!-- A post's tags displayed as a row of badges. -->
  <TextArrayField source="tags" :record="post" />
</template>
