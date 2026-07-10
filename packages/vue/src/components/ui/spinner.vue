<script setup lang="ts">
/**
 * `<Spinner>` — the shadcn-vue spinner primitive, the Vue analog of
 * `@chelone/react`'s `ui/spinner.tsx`. A spinning `Loader2` glyph carrying
 * `role="status"` + `aria-label="Loading"` so it announces as a busy indicator.
 *
 * `@chelone/vue` carries no icon library (unlike the React twin's
 * `lucide-react`), so the glyph is an inline SVG — the same convention the rest
 * of the Vue component surface uses (see `layout/icons.ts`).
 */

import { computed } from "vue";
import { cn } from "../../lib/utils";

const props = defineProps<{ class?: string }>();

const classes = computed(() => cn("size-4 animate-spin", props.class));
</script>

<template>
  <svg
    role="status"
    aria-label="Loading"
    :class="classes"
    data-slot="spinner"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="false"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
</template>
