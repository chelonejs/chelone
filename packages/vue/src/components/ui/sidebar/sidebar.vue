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

import { onBeforeUnmount, watch } from "vue";
import { cn } from "../../../lib/utils";
import { useSidebar } from "./sidebar-context";

const props = withDefaults(defineProps<SidebarProps>(), {
  variant: "sidebar",
  collapsible: "icon",
  side: "left",
});

const { state, isMobile, openMobile, setOpenMobile } = useSidebar();

// Below the md breakpoint the sidebar is a drawer, closed by Escape or a
// backdrop click. Same dependency-free pattern as `admin/feedback/confirm.vue`:
// inline, no `<Teleport>`, the keydown listener bound only while it is open.
function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") setOpenMobile(false);
}

watch(
  () => isMobile.value && openMobile.value,
  (open) => {
    if (typeof document === "undefined") return;
    if (open) document.addEventListener("keydown", onKeydown);
    else document.removeEventListener("keydown", onKeydown);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined")
    document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <template v-if="isMobile">
    <div
      v-if="openMobile"
      class="fixed inset-0 z-50 text-sidebar-foreground"
      data-slot="sidebar-drawer-root"
    >
      <div
        class="absolute inset-0 bg-black/50"
        data-slot="sidebar-backdrop"
        @click="setOpenMobile(false)"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar"
        :class="
          cn(
            'absolute inset-y-0 flex h-svh w-(--sidebar-width) flex-col bg-sidebar shadow-lg',
            side === 'right' ? 'right-0' : 'left-0',
            props.class,
          )
        "
        :data-side="side"
        data-slot="sidebar-drawer"
      >
        <slot />
      </div>
    </div>
  </template>
  <div
    v-else
    class="group peer hidden text-sidebar-foreground md:block"
    :data-state="state"
    :data-collapsible="state === 'collapsed' ? collapsible : ''"
    :data-variant="variant"
    :data-side="side"
    data-slot="sidebar"
  >
    <!-- `w-(--sidebar-width)`, not `w-[--sidebar-width]`: Tailwind v4 dropped the
         bracket shorthand for a custom property, and the bracket form generates a
         rule with no declaration, leaving the sidebar to size itself to its
         content instead of the var. -->
    <div
      :class="
        cn(
          'flex h-svh flex-col bg-sidebar transition-[width] duration-200 ease-linear',
          state === 'collapsed' && collapsible === 'icon'
            ? variant === 'floating'
              ? 'w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
              : 'w-(--sidebar-width-icon)'
            : 'w-(--sidebar-width)',
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
