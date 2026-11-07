<script lang="ts">
import type { Component } from "vue";

/** Props for {@link SidebarMenuButton}. */
export interface SidebarMenuButtonProps {
  /**
   * The element/component to render as. Defaults to `"button"`; pass a link
   * component (e.g. vue-router's `RouterLink`) to render a navigable entry —
   * the Vue idiom replacing the React twin's `asChild` + `<Slot>`. Extra attrs
   * (`to`, `href`, …) fall through to the rendered element.
   */
  as?: string | Component;
  /** Highlights the entry as the active route. */
  isActive?: boolean;
  /** Size preset. Defaults to `default`. */
  size?: "default" | "sm" | "lg";
  /** Extra class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SidebarMenuButton>` — a sidebar entry (button or link). The Vue analog of
 * shadcn's `SidebarMenuButton`. Rather than reka-ui's `asChild`/`<Slot>`, it
 * renders `<component :is="as">` (default `button`) so a caller passes
 * `:as="RouterLink" :to="…"` for a navigable item; fallthrough attrs carry the
 * link target. `isActive` drives the `data-active` state + the active styling.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";

const props = withDefaults(defineProps<SidebarMenuButtonProps>(), {
  as: "button",
  isActive: false,
  size: "default",
});

const classes = computed(() =>
  cn(
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
    props.isActive &&
      "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
    // A floor, not a fixed height, so a wrapped label grows the box and keeps
    // its highlight; `py-1.5` keeps a one-line row at that floor.
    props.size === "default" && "min-h-8 py-1.5",
    props.size === "sm" && "min-h-7 py-1.5 text-xs",
    props.size === "lg" && "h-12 text-sm",
    props.class,
  ),
);
</script>

<template>
  <component
    :is="as"
    :class="classes"
    :data-active="isActive || undefined"
    data-slot="sidebar-menu-button"
  >
    <slot />
  </component>
</template>
