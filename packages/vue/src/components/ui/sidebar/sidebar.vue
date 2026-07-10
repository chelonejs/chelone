<script lang="ts">
/** Props for {@link Sidebar}. */
export interface SidebarProps {
  /** Visual variant. `floating` insets + rounds the panel. Defaults to `sidebar`. */
  variant?: "sidebar" | "floating" | "inset";
  /** Collapse behavior when closed. Defaults to `icon`. */
  collapsible?: "offcanvas" | "icon" | "none";
  /** Which edge the sidebar docks to. Defaults to `left`. */
  side?: "left" | "right";
  /** Extra class appended to the inner panel. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Sidebar>` — the sidebar shell: a fixed-width column that collapses to icon
 * width when `useSidebar().state` is `collapsed`. The Vue analog of shadcn's
 * `Sidebar`, trimmed to a dependency-free single-column layout (the React twin's
 * fixed/offcanvas gap machinery is deferred). Carries the `data-state` /
 * `data-collapsible` / `data-variant` / `data-side` attributes the layout CSS
 * (and the `peer`-based `<main>` width transition) key off.
 */

import { cn } from "../../../lib/utils";
import { useSidebar } from "./sidebar-context";

const props = withDefaults(defineProps<SidebarProps>(), {
  variant: "sidebar",
  collapsible: "icon",
  side: "left",
});

const { state } = useSidebar();
</script>

<template>
  <div
    class="group peer hidden text-sidebar-foreground md:block"
    :data-state="state"
    :data-collapsible="state === 'collapsed' ? collapsible : ''"
    :data-variant="variant"
    :data-side="side"
    data-slot="sidebar"
  >
    <div
      :class="
        cn(
          'flex h-svh flex-col bg-sidebar transition-[width] duration-200 ease-linear',
          state === 'collapsed' && collapsible === 'icon'
            ? 'w-[--sidebar-width-icon]'
            : 'w-[--sidebar-width]',
          variant === 'floating' && 'p-2',
          props.class,
        )
      "
      data-slot="sidebar-inner"
    >
      <slot />
    </div>
  </div>
</template>
