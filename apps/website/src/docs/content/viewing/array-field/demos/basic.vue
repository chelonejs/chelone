<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { ArrayField, ChipField, SingleFieldList } from "@chelone/vue";

const post = {
  id: 1,
  tags: [
    { id: 1, name: "Science" },
    { id: 2, name: "Computing" },
  ],
};
</script>

<template>
  <!-- `<ArrayField>` displays a post's embedded tags. -->
  <ArrayField source="tags" :record="post">
    <SingleFieldList>
      <ChipField source="name" />
    </SingleFieldList>
  </ArrayField>
</template>
