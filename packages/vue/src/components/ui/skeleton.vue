<script setup lang="ts">
/**
 * `<Skeleton>` — a pulsing placeholder block, the Vue analog of shadcn's
 * `Skeleton`. Dependency-free (a `div` with the `animate-pulse` recipe); used by
 * `<UserMenu>` while the identity query is pending.
 */

import { cn } from "../../lib/utils";

const props = defineProps<{ class?: string }>();
</script>

<template>
  <div
    :class="cn('animate-pulse rounded-md bg-muted', props.class)"
    data-slot="skeleton"
  />
</template>
