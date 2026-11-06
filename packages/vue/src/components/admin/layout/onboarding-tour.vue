<script lang="ts">
import type { TourEnd, TourPlacement } from "@chelone/core";

export interface TourStep {
  /** CSS selector of the element to highlight. A step whose element is missing shows a centred card. */
  target: string;
  title?: string;
  content: string;
  /** Overrides the tour's `placement` for this step. */
  placement?: TourPlacement;
}

/** Props for {@link OnboardingTour}. */
export interface OnboardingTourProps {
  /** Names the tour in the store: finishing or skipping it stores `onboarding-tour.<id>.completed`. */
  id: string;
  steps: TourStep[];
  /** Open on mount while the tour is not stored as done. Default `true`. */
  autoStart?: boolean;
  /** Where the card sits relative to its target. Default `"auto"`. */
  placement?: TourPlacement;
}
</script>

<script setup lang="ts">
/**
 * `<OnboardingTour>` — highlights one element per step with a card beside it,
 * and remembers in the store that the tour is done. The Vue twin of
 * `@chelone/react`'s `layout/onboarding-tour.tsx`; the state machine and the
 * geometry come from `@chelone/core`. Mount once, anywhere under `<Admin>`.
 *
 * Emits `complete` with `"finished"` or `"skipped"`, the Vue idiom for the
 * React twin's `onComplete`. A `#step` slot, given `{ step, index }`, replaces
 * the card's title and content.
 */

import Host from "./onboarding-tour-host.vue";

const props = withDefaults(defineProps<OnboardingTourProps>(), {
  autoStart: true,
  placement: "auto",
});

const emit = defineEmits<{
  (event: "complete", reason: TourEnd): void;
}>();
</script>

<template>
  <Host
    :key="`${props.id}:${props.steps.length}:${props.autoStart}`"
    :id="props.id"
    :steps="props.steps"
    :auto-start="props.autoStart"
    :placement="props.placement"
    @complete="emit('complete', $event)"
  >
    <template v-if="$slots.step" #step="scope">
      <slot name="step" v-bind="scope" />
    </template>
  </Host>
</template>
