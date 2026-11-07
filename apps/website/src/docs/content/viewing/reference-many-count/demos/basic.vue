<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { ReferenceManyCount } from "@chelone/vue";

const author = { id: 1, name: "Ada Lovelace" };
</script>

<template>
  <!-- `<ReferenceManyCount>` counts the posts whose `author_id` points back at this author, without loading them. -->
  <p class="text-sm">
    Ada Lovelace wrote
    <ReferenceManyCount reference="posts" target="author_id" :record="author" />
    posts.
  </p>
</template>
