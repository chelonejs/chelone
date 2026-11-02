<script setup lang="ts">
/**
 * `<MonacoSkeleton>` — the pulsing placeholder shown while the editor chunk
 * loads. The Vue twin of `@chelone/react`'s `MonacoSkeleton`.
 */

import Skeleton from "../../ui/skeleton.vue";
</script>

<template>
  <Skeleton
    role="status"
    aria-label="Loading editor"
    class="h-[120px] w-full border"
  />
</template>
