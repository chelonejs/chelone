<script setup lang="ts">
import { JsonField } from "@chelone/vue";

const post = {
  id: 1,
  metadata: { category: "Computing", tags: ["Science", "History"] },
};
</script>

<template>
  <!-- `<JsonField>` displays a post's metadata as indented JSON. -->
  <JsonField source="metadata" :record="post" />
</template>
