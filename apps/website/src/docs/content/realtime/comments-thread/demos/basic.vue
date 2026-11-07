<script setup lang="ts">
import { CommentsThread, Show } from "@chelone/vue";
</script>

<template>
  <!-- Post 1's thread: post a comment, or mark one resolved. -->
  <Show :id="1" title="">
    <CommentsThread reference="comments" target="post_id" resolvable />
  </Show>
</template>
