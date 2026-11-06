<script setup lang="ts">
/** What a data block shows in place of its data: a hint, a failure or a skeleton. */

import Skeleton from "../ui/skeleton.vue";

defineProps<{ kind: "empty" | "error" | "loading" }>();

const box = "my-2 rounded-md border border-dashed p-6 text-center text-sm";
</script>

<template>
  <Skeleton v-if="kind === 'loading'" data-slot="data-block-loading" class="my-2 h-24" />
  <div
    v-else-if="kind === 'error'"
    role="alert"
    :class="`${box} border-destructive/50 text-destructive`"
  >
    <slot />
  </div>
  <div v-else :class="`${box} text-muted-foreground`"><slot /></div>
</template>
