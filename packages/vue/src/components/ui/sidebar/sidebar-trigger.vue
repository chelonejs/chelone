<script setup lang="ts">
/**
 * `<SidebarTrigger>` — the button that toggles the sidebar. The Vue analog of
 * shadcn's `SidebarTrigger`: a ghost icon button (the `PanelLeft` glyph, inlined
 * as SVG — the Vue slice carries no icon dependency) wired to
 * `useSidebar().toggleSidebar`. The click falls through the `<Button>`'s native
 * `<button>` root.
 */

import Button from "../button.vue";
import { useSidebar } from "./sidebar-context";

const { toggleSidebar } = useSidebar();
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="size-7"
    data-slot="sidebar-trigger"
    aria-label="Toggle Sidebar"
    @click="toggleSidebar"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-4"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
