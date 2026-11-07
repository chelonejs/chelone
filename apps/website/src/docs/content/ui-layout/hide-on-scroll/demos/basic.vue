<script setup lang="ts">
/**
 * `<HideOnScroll>` hides the header it wraps on a downward scroll past
 * `threshold` and reveals it again on the way up. It reads the window it sits
 * in, and the preview frame is fitted to the demo's height, so the demo gives
 * the preview a page of its own to scroll (see the style block below).
 */

import { HideOnScroll } from "@chelone/vue";
</script>

<template>
  <!-- Pinned to the preview viewport so the toolbar stays in view while the page scrolls under it. -->
  <div class="fixed inset-4 overflow-hidden rounded-md border">
    <HideOnScroll class="bg-muted p-4 font-medium">Posts toolbar</HideOnScroll>
    <p class="p-4 text-sm text-muted-foreground">
      Scroll the preview down, then up to reveal the toolbar again.
    </p>
  </div>
</template>

<style>
/* The frame is fitted to the demo's own height, so a scroll-driven demo needs
   room the demo does not fill: the preview document is taller than the frame,
   and the frame scrolls. */
html {
  min-height: 40rem;
}
</style>
