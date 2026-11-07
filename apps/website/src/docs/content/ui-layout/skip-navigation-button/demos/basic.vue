<script setup lang="ts">
/**
 * `<SkipNavigationButton>` sits above the preview's viewport until a keyboard
 * user tabs to it, then moves focus to `#main-content`. Click into the preview
 * and press Tab to reveal it.
 */

import { SkipNavigationButton } from "@chelone/vue";
</script>

<template>
  <div>
    <SkipNavigationButton />
    <p class="text-sm text-muted-foreground">Press Tab to reveal the skip link.</p>
    <main id="main-content">Page content</main>
  </div>
</template>
