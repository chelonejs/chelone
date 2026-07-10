<script setup lang="ts">
/**
 * `<Button>` — the shadcn-vue button primitive, the Vue analog of
 * `@chelone/react`'s `ui/button.tsx`. Kept minimal + DEPENDENCY-FREE: it renders
 * a native `<button>` with the shadcn variant/size class recipe (no reka-ui
 * `Slot`/`asChild` — the V1 admin slice never needs polymorphic rendering, so
 * the `asChild` reka-ui surface is deferred). Variants/sizes mirror shadcn's
 * class tokens so the design language matches the React package.
 */

import { computed } from "vue";
import {
  type ButtonSize,
  type ButtonVariant,
  buttonVariants,
} from "./button-variants";

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    class?: string;
  }>(),
  { variant: "default", size: "default", type: "button", disabled: false },
);

const classes = computed(() =>
  buttonVariants({
    variant: props.variant,
    size: props.size,
    class: props.class,
  }),
);
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes" data-slot="button">
    <slot />
  </button>
</template>
