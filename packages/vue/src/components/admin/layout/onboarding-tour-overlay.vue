<script lang="ts">
let nextTitleId = 0;

const REMEASURE_MS = 250;

function findTarget(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    // An invalid selector throws a SyntaxError: count it as a missing target.
    return null;
  }
}
</script>

<script setup lang="ts">
/**
 * The open tour: scrim, ring and card. The Vue twin of `TourOverlay` in
 * `@chelone/react`'s `layout/onboarding-tour.tsx`. `<OnboardingTour>` mounts it
 * only while the tour is active, so mounting is opening and unmounting is
 * closing: focus is taken on mount and given back on unmount.
 */

import {
  placeTourCard,
  type TourController,
  type TourPlacement,
  type TourRect,
  tourSpotlightPath,
} from "@chelone/core";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import type { TourStep } from "./onboarding-tour.vue";

const props = defineProps<{
  controller: TourController;
  step: TourStep;
  index: number;
  total: number;
  placement: TourPlacement;
}>();

const translate = useTranslate();
const titleId = `chelone-tour-title-${nextTitleId++}`;
const card = useTemplateRef<HTMLElement>("card");
const advance = useTemplateRef<InstanceType<typeof Button>>("advance");
const rect = shallowRef<TourRect | null>(null);
const cardSize = ref({ width: 0, height: 0 });
const viewport = ref({ width: 0, height: 0 });
const isLast = computed(() => props.index === props.total - 1);

function focusAdvance() {
  advance.value?.$el.focus();
}

function remeasure() {
  const element = findTarget(props.step.target);
  let next: TourRect | null = null;
  if (element) {
    const { top, left, width, height } = element.getBoundingClientRect();
    next = { top, left, width, height };
  }
  const current = rect.value;
  const same =
    current === null || next === null
      ? current === next
      : current.top === next.top &&
        current.left === next.left &&
        current.width === next.width &&
        current.height === next.height;
  if (!same) rect.value = next;
  viewport.value = { width: window.innerWidth, height: window.innerHeight };
}

function measureCard() {
  if (!card.value) return;
  const { width, height } = card.value.getBoundingClientRect();
  if (cardSize.value.width !== width || cardSize.value.height !== height) {
    cardSize.value = { width, height };
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    props.controller.skip();
    return;
  }
  if (event.key !== "Tab") return;
  // The card is aria-modal, so Tab wraps inside it instead of reaching the page behind the scrim.
  const buttons = card.value?.querySelectorAll("button");
  const first = buttons?.item(0);
  const last = buttons?.item(buttons.length - 1);
  if (!first || !last) return;
  const current = document.activeElement;
  const inside = card.value?.contains(current) ?? false;
  if (event.shiftKey && (current === first || !inside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (current === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}

function onFocusIn(event: FocusEvent) {
  const { target } = event;
  if (target instanceof Node && !card.value?.contains(target)) focusAdvance();
}

// The element that had focus gets it back when the tour closes.
let previous: Element | null = null;
let timer: number | undefined;

function revealTarget() {
  findTarget(props.step.target)?.scrollIntoView({ block: "center" });
  remeasure();
}

onMounted(() => {
  previous = document.activeElement;
  revealTarget();
  measureCard();
  focusAdvance();
  window.addEventListener("resize", remeasure);
  window.addEventListener("scroll", remeasure, true);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("focusin", onFocusIn);
  timer = window.setInterval(remeasure, REMEASURE_MS);
});

onUpdated(measureCard);

watch(() => props.step.target, revealTarget, { flush: "post" });
// `index` re-runs this for a step that shares its predecessor's target.
watch(() => props.index, focusAdvance, { flush: "post" });

onBeforeUnmount(() => {
  window.removeEventListener("resize", remeasure);
  window.removeEventListener("scroll", remeasure, true);
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("focusin", onFocusIn);
  window.clearInterval(timer);
  if (previous instanceof HTMLElement) previous.focus();
});

const position = computed(() =>
  placeTourCard({
    target: rect.value,
    card: cardSize.value,
    viewport: viewport.value,
    placement: props.placement,
  }),
);
</script>

<template>
  <div data-slot="onboarding-tour">
    <div
      data-slot="tour-scrim"
      aria-hidden="true"
      class="fixed inset-0 z-[100] bg-black/50"
      :style="rect ? { clipPath: tourSpotlightPath(rect) } : undefined"
      @click="controller.skip()"
    />
    <div
      v-if="rect"
      data-slot="tour-ring"
      aria-hidden="true"
      class="pointer-events-none fixed z-[100] rounded-md ring-2 ring-primary"
      :style="{
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }"
    />
    <div
      ref="card"
      data-slot="tour-card"
      :data-side="position.side"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="!$slots.step && step.title ? titleId : undefined"
      class="fixed z-[101] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    >
      <slot name="step" :step="step" :index="index">
        <h2 v-if="step.title" :id="titleId" class="mb-1 text-sm font-semibold">
          {{ step.title }}
        </h2>
        <div class="text-sm text-muted-foreground">{{ step.content }}</div>
      </slot>
      <div class="mt-4 flex items-center gap-2">
        <span class="mr-auto text-xs text-muted-foreground">
          {{ index + 1 }} / {{ total }}
        </span>
        <Button variant="ghost" size="sm" @click="controller.skip()">
          {{ translate("chelone.onboarding_tour.skip", { _: "Skip" }) }}
        </Button>
        <Button
          v-if="index > 0"
          variant="outline"
          size="sm"
          @click="controller.back()"
        >
          {{ translate("chelone.onboarding_tour.back", { _: "Back" }) }}
        </Button>
        <Button ref="advance" size="sm" @click="controller.next()">
          {{
            isLast
              ? translate("chelone.onboarding_tour.finish", { _: "Finish" })
              : translate("chelone.onboarding_tour.next", { _: "Next" })
          }}
        </Button>
      </div>
    </div>
  </div>
</template>
