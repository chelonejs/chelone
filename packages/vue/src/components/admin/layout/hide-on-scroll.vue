<script lang="ts">
/** Props for {@link HideOnScroll}. */
export interface HideOnScrollProps {
  /** Scroll offset in pixels a downward scroll must pass before hiding. @default 100 */
  threshold?: number;
  /** Extra class merged onto the wrapper div. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<HideOnScroll>` — wraps a header and sets `data-state="hidden"` on a
 * downward scroll past `threshold`, `"visible"` on any upward scroll. The Vue
 * twin of `@chelone/react`'s `layout/hide-on-scroll.tsx`.
 */

import { onBeforeUnmount, onMounted, ref } from "vue";
import { cn } from "../../../lib/utils";

const props = withDefaults(defineProps<HideOnScrollProps>(), {
  threshold: 100,
});

const hidden = ref(false);
let lastY = 0;

// Reads `props.threshold` per scroll, so a changed threshold needs no re-subscription.
function onScroll() {
  const y = window.scrollY;
  if (y > lastY && y > props.threshold) hidden.value = true;
  else if (y < lastY) hidden.value = false;
  lastY = y;
}

onMounted(() => {
  lastY = window.scrollY;
  window.addEventListener("scroll", onScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <div
    :data-state="hidden ? 'hidden' : 'visible'"
    :class="
      cn(
        'transition-transform duration-300 data-[state=hidden]:-translate-y-full',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
