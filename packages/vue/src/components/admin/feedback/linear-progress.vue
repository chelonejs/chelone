<script lang="ts">
/** Props for {@link LinearProgress}. */
export interface LinearProgressProps {
  /** Delay (ms) before the bar appears. Default `1000`. */
  timeout?: number;
  /** When set, switches to determinate mode: fills to `(value / max) * 100%`. */
  value?: number;
  /** Maximum used to compute the fill percentage. Default `100`. */
  max?: number;
  /** Extra CSS class appended to the bar container. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<LinearProgress>` — a delayed loading bar standing in for an input/field while
 * data loads. The Vue twin of `@chelone/react`'s `feedback/linear-progress.tsx`.
 * The delay avoids a visual jump when the bar is finally replaced by the resolved
 * value. Indeterminate by default; determinate when `value` is provided.
 *
 * Idiom translation: React's `useTimeout` compat hook becomes the Vue
 * `useTimeout` ref; the pre-delay placeholder keeps layout height stable.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useTimeout } from "./use-timeout";

const props = withDefaults(defineProps<LinearProgressProps>(), {
  timeout: 1000,
  max: 100,
});

const ready = useTimeout(props.timeout);
const classes = computed(() =>
  cn("my-2 w-40 h-1 overflow-hidden rounded bg-muted", props.class),
);
const fillWidth = computed(() =>
  props.value !== undefined ? `${(props.value / props.max) * 100}%` : undefined,
);
</script>

<template>
  <span v-if="!ready" class="block my-1 h-1" />
  <div v-else data-slot="linear-progress" :class="classes">
    <div
      v-if="value !== undefined"
      class="h-full bg-primary transition-all"
      :style="{ width: fillWidth }"
    />
    <div v-else class="h-full w-1/2 bg-primary animate-pulse" />
  </div>
</template>
