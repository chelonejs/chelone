<script setup lang="ts">
import { SimpleListLoading } from "@chelone/vue";
</script>

<template>
  <!-- `<SimpleListLoading>` shows placeholder rows for a list that is still loading, and only after a one-second grace period, so a fast response never flashes a skeleton. -->
  <div class="w-full">
    <p class="px-4 py-2 text-sm text-muted-foreground">
      Posts, while the first page is still loading
    </p>
    <SimpleListLoading :nb-fake-lines="3" has-secondary-text />
  </div>
</template>
