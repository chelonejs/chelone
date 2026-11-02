<script setup lang="ts">
/**
 * `<MonacoSkeleton>` — the pulsing placeholder shown while the editor chunk
 * loads. The Vue twin of `@chelone/react`'s `MonacoSkeleton`.
 */

import Skeleton from "../../ui/skeleton.vue";

// Without a `height` the placeholder keeps its default 120px.
defineProps<{ height?: number }>();
</script>

<template>
  <Skeleton
    role="status"
    aria-label="Loading editor"
    :class="`${height == null ? 'h-[120px] ' : ''}w-full border`"
    :style="height == null ? undefined : { height: `${height}px` }"
  />
</template>
