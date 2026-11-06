<script setup lang="ts">
/**
 * Owns one tour controller. `<OnboardingTour>` keys this on the props the
 * controller is built from, so a change to any of them starts a fresh
 * controller, as the React twin's `useMemo` does.
 */

import { createTourController, type TourEnd } from "@chelone/core";
import { computed } from "vue";
import { useCheloneStore } from "../../../context";
import { useMicroStore } from "../../../store/use-micro-store";
import Overlay from "./onboarding-tour-overlay.vue";
import type { OnboardingTourProps } from "./onboarding-tour.vue";

const props = withDefaults(defineProps<OnboardingTourProps>(), {
  autoStart: true,
  placement: "auto",
});

const emit = defineEmits<{
  (event: "complete", reason: TourEnd): void;
}>();

const controller = createTourController({
  id: props.id,
  stepCount: props.steps.length,
  store: useCheloneStore(),
  autoStart: props.autoStart,
  onComplete: (reason) => emit("complete", reason),
});
const state = useMicroStore(controller);
const step = computed(() => props.steps[state.value.index]);
</script>

<template>
  <Teleport to="body">
    <Overlay
      v-if="state.active && step"
      :controller="controller"
      :step="step"
      :index="state.index"
      :total="steps.length"
      :placement="step.placement ?? placement"
    >
      <template v-if="$slots.step" #step="scope">
        <slot name="step" v-bind="scope" />
      </template>
    </Overlay>
  </Teleport>
</template>
