<script lang="ts">
/** The `size` scale the admin spinner layers over the base `ui/spinner`. */
export type SpinnerSize = "small" | "medium" | "large";

/** Props for {@link Spinner} (the feedback spinner). */
export interface SpinnerContentProps {
  /** Diameter scale. Default `"medium"`. */
  size?: SpinnerSize;
  /** When `false`, renders nothing (a gate for conditional spinners). */
  show?: boolean;
  /** Extra CSS class appended to the spinner. */
  class?: string;
  /** Accessible label. Default `"Loading"`. */
  "aria-label"?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Spinner>` (feedback) — the admin-kit spinner over the `ui/spinner`
 * primitive, the Vue twin of `@chelone/react`'s `feedback/spinner.tsx`. Layers a
 * `size` scale, an optional `show` gate, and the primary color onto the base
 * spinner. Used by `<Loading>`.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import UISpinner from "../../ui/spinner.vue";

const props = withDefaults(defineProps<SpinnerContentProps>(), {
  size: "medium",
  show: true,
});

const sizeClasses: Record<SpinnerSize, string> = {
  small: "size-6",
  medium: "size-8",
  large: "size-12",
};

const classes = computed(() =>
  cn("text-primary", sizeClasses[props.size], props.class),
);
const label = computed(() => props["aria-label"] ?? "Loading");
</script>

<template>
  <UISpinner v-if="show" :aria-label="label" :class="classes" />
</template>
