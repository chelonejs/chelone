<script lang="ts">
/** Props for {@link SidebarProvider}. */
export interface SidebarProviderProps {
  /** Initial open state of the desktop sidebar. Defaults to `true`. */
  defaultOpen?: boolean;
  /** Extra class appended to the wrapper element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SidebarProvider>` — owns the sidebar open/collapsed + mobile-drawer state and
 * `provide`s it under {@link SidebarContextKey}. The Vue analog of shadcn's
 * `SidebarProvider`, dependency-free (plain refs, no reka-ui). Renders the flex
 * wrapper that seats the `<Sidebar>` and the `<main>` content side by side, and
 * exposes the `--sidebar-width*` CSS vars the collapse transition reads.
 */

import { computed, provide, ref } from "vue";
import { cn } from "../../../lib/utils";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SidebarContextKey,
  type SidebarState,
} from "./sidebar-context";
import { useIsMobile } from "./use-is-mobile";

const props = withDefaults(defineProps<SidebarProviderProps>(), {
  defaultOpen: true,
});

const open = ref(props.defaultOpen);
const openMobile = ref(false);
const isMobile = useIsMobile();
const state = computed<SidebarState>(() =>
  open.value ? "expanded" : "collapsed",
);

function setOpen(value: boolean): void {
  open.value = value;
}

function setOpenMobile(value: boolean): void {
  openMobile.value = value;
}

function toggleSidebar(): void {
  if (isMobile.value) {
    openMobile.value = !openMobile.value;
  } else {
    open.value = !open.value;
  }
}

provide(SidebarContextKey, {
  state,
  open,
  setOpen,
  openMobile,
  setOpenMobile,
  isMobile,
  toggleSidebar,
});
</script>

<template>
  <div
    data-slot="sidebar-wrapper"
    :data-state="state"
    :style="{
      '--sidebar-width': SIDEBAR_WIDTH,
      '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
    }"
    :class="cn('group/sidebar-wrapper flex min-h-svh w-full', props.class)"
  >
    <slot />
  </div>
</template>
