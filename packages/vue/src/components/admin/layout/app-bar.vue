<script lang="ts">
/** Props for {@link AppBar}. */
export interface AppBarProps {
  /** Extra class appended to the header element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<AppBar>` — the header at the top of the admin layout: the sidebar trigger, a
 * page-title slot, a spacer, and the right-side action cluster (theme toggle +
 * user menu). The Vue twin of `@chelone/react`'s `layout/app-bar.tsx`.
 *
 * Slots (the Vue idiom for the React twin's override props):
 * - `#start` — replaces the default `<SidebarTrigger>`.
 * - `#title` — the page-title region (a `<Title>`/breadcrumb slot lands later).
 * - `#toolbar` — replaces the default `<ThemeModeToggle>`.
 * - `#user-menu` — the user menu (a `<UserMenu>` component lands in a later wave).
 */

import { cn } from "../../../lib/utils";
import { SidebarTrigger } from "../../ui/sidebar";
import ThemeModeToggle from "./theme-mode-toggle.vue";

const props = defineProps<AppBarProps>();
</script>

<template>
  <header
    :class="
      cn(
        'flex h-14 shrink-0 items-center gap-2 border-b px-4 md:h-12',
        props.class,
      )
    "
    data-slot="app-bar"
  >
    <slot name="start">
      <SidebarTrigger />
    </slot>
    <div class="flex min-w-0 flex-1 items-center" data-slot="app-bar-title">
      <slot name="title" />
    </div>
    <slot name="toolbar">
      <ThemeModeToggle />
    </slot>
    <slot name="user-menu" />
  </header>
</template>
