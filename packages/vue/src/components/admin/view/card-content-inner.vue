<script lang="ts">
/** Props for {@link CardContentInner}. */
export interface CardContentInnerProps {
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<CardContentInner>` — one section of a `<Card>` with several stacked
 * sections, the Vue twin of `@chelone/react`'s `views/card-content-inner.tsx`.
 * The first section adds the top padding and the last the bottom padding, so
 * adjacent sections do not double their padding.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";

const props = defineProps<CardContentInnerProps>();

const classes = computed(() =>
  cn("px-6 py-0 first:pt-4 last:pb-[70px] sm:last:pb-4", props.class),
);
</script>

<template>
  <div :class="classes"><slot /></div>
</template>
