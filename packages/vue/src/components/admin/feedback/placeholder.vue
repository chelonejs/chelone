<script lang="ts">
/** Props for {@link Placeholder}. */
export interface PlaceholderProps {
  /** Merged after the default `inline-flex bg-muted` classes. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Placeholder>` — a muted block that holds a field's height while its value
 * loads. The Vue twin of `@chelone/react`'s `feedback/placeholder.tsx`. With no
 * slot content it renders a non-breaking space: a plain space collapses to zero
 * height in a flex container.
 *
 * @example
 * <Placeholder class="w-24" />
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";

const props = defineProps<PlaceholderProps>();

const classes = computed(() => cn("inline-flex bg-muted", props.class));
</script>

<template>
  <span :class="classes"><slot>&nbsp;</slot></span>
</template>
