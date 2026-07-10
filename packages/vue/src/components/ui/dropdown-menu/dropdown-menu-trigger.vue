<script setup lang="ts">
/**
 * `<DropdownMenuTrigger>` — toggles the menu open on click. The Vue analog of
 * shadcn's `DropdownMenuTrigger asChild`: instead of reka-ui's `<Slot>`, it
 * wraps its child in a `display: contents` span (so it adds no box) and listens
 * for the bubbled click. The child (typically a `<Button>`) keeps its own
 * `aria-label` / styling untouched.
 */

import { useDropdownMenu } from "./context";

const { toggle, open } = useDropdownMenu();
</script>

<template>
  <span
    style="display: contents"
    data-slot="dropdown-menu-trigger"
    :data-state="open ? 'open' : 'closed'"
    @click="toggle"
  >
    <slot />
  </span>
</template>
