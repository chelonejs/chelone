<script setup lang="ts">
/**
 * `<IconButtonWithTooltip>` shows an information icon named by its label. The
 * Vue `ui` slice carries no tooltip primitive, so the label shows as the native
 * `title` on hover, and the icon is an inline SVG: `@chelone/vue` ships no icon
 * library.
 */

import { IconButtonWithTooltip } from "@chelone/vue";
</script>

<template>
  <IconButtonWithTooltip label="Posts are stored in memory">
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  </IconButtonWithTooltip>
</template>
