<script setup lang="ts">
/**
 * `<Menu>` — the sidebar navigation menu, auto-generated from the registered
 * resources. The Vue twin of `@chelone/react`'s `layout/menu.tsx`. By default it
 * renders a `<DashboardMenuItem>` (only when the app has a dashboard, via
 * `useHasDashboard`) followed by a `<ResourceMenuItemGroup>` that emits one entry
 * per list-enabled resource. Passing default-slot children REPLACES the auto
 * resource list (use `<MenuItemLink>` / `<ResourceMenuItem>` / `<DashboardMenuItem>`
 * for a fully custom nav tree).
 *
 * Vue divergence from the React twin: the Vue `ResourceDefinition` has no
 * `options.group` bag yet, so resources render as one flat unlabeled group
 * rather than the React twin's per-`options.group` collapsible sections (a later
 * wave). The reactive registry replaces React's `useResourceDefinitions` hook.
 */

import { useHasDashboard } from "../../../admin/has-dashboard";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "../../ui/sidebar";
import type { VNode } from "vue";
import DashboardMenuItem from "./dashboard-menu-item.vue";
import ResourceMenuItemGroup from "./resource-menu-item-group.vue";

defineSlots<{
  /** Custom nav entries that REPLACE the auto resource list. */
  default?: () => VNode[];
}>();

const hasDashboard = useHasDashboard();
</script>

<template>
  <!-- Custom children win over the auto resource list (parity with the React
       twin's `children` branch). -->
  <SidebarGroup v-if="$slots.default">
    <SidebarGroupContent>
      <SidebarMenu>
        <slot />
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
  <template v-else>
    <SidebarGroup v-if="hasDashboard">
      <SidebarGroupContent>
        <SidebarMenu>
          <DashboardMenuItem />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
    <ResourceMenuItemGroup />
  </template>
</template>
