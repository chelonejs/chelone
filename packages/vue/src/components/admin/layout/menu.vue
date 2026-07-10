<script setup lang="ts">
/**
 * `<Menu>` — the sidebar navigation menu, auto-generated from the registered
 * resources. The Vue twin of `@chelone/react`'s `layout/menu.tsx`. Renders one
 * `<ResourceMenuItem>` per resource that exposes a list view; the default slot
 * appends custom entries after the resource list.
 *
 * Vue divergences: it reads the reactive `<Admin>` registry directly (Vue has no
 * `useResourceDefinitions` hook — the registry IS reactive) and, because the Vue
 * `ResourceDefinition` has no `options.group` bag yet, resources render as one
 * flat list rather than the React twin's collapsible groups (a later wave).
 */

import { computed } from "vue";
import { useResourceRegistry } from "../../../admin/resource-registry";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "../../ui/sidebar";
import ResourceMenuItem from "./resource-menu-item.vue";

const registry = useResourceRegistry();

// Reading `Object.keys(registry.definitions)` tracks the shallow-reactive key
// set, so the menu re-renders as `<Resource>`s register/unregister.
const listResources = computed(() =>
  Object.keys(registry.definitions).filter(
    (name) => registry.definitions[name]?.list != null,
  ),
);
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <ResourceMenuItem
          v-for="name in listResources"
          :key="name"
          :name="name"
        />
        <slot />
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
