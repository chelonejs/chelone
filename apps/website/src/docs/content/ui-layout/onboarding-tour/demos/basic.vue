<script setup lang="ts">
/**
 * `<OnboardingTour>` highlights each target in turn. `autoStart` is off so the
 * tour waits for the button, which calls `start()` on a template ref.
 */

import { Button, OnboardingTour, type TourStep } from "@chelone/vue";
import { useTemplateRef } from "vue";

const steps: TourStep[] = [
  {
    target: "[data-tour='demo-title']",
    title: "Your posts",
    content: "Every post you write shows up here.",
  },
  {
    target: "[data-tour='demo-new']",
    title: "Write one",
    content: "Start a new post from this button.",
  },
];

const tour = useTemplateRef("tour");
</script>

<template>
  <!-- The card is pinned to the preview's own viewport, so the demo keeps room
       below its targets for it. -->
  <div class="flex min-h-56 w-full max-w-md flex-col gap-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold" data-tour="demo-title">Posts</h3>
      <Button size="sm" data-tour="demo-new">New post</Button>
    </div>
    <Button variant="outline" @click="tour?.start()">Start the tour</Button>
    <OnboardingTour
      ref="tour"
      id="docs-demo"
      :steps="steps"
      :auto-start="false"
    />
  </div>
</template>
