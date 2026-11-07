<script setup lang="ts">
import { Count } from "@chelone/vue";
</script>

<template>
  <!-- `<Count>` shows how many seeded posts are published. -->
  <p>Published posts: <Count :filter="{ published: true }" /></p>
</template>
