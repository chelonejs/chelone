<script setup lang="ts">
import { Placeholder } from "@chelone/vue";
</script>

<template>
  <!-- `<Placeholder>` is the muted bar that holds a field's height until its value lands, here under the "Title" label. -->
  <p class="flex items-center gap-2">
    <span class="text-sm text-muted-foreground">Title</span>
    <Placeholder class="h-5 w-40" />
  </p>
</template>
