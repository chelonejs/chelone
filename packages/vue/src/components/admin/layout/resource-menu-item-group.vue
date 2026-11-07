<script lang="ts">
/** Props for {@link ResourceMenuItemGroup}. */
export interface ResourceMenuItemGroupProps {
  /** Optional section label. Omit for the ungrouped resource section. */
  label?: string;
  /**
   * Resource names to render. When omitted, every registered resource that
   * exposes a list view is rendered.
   */
  resources?: string[];
  /** Extra CSS class appended to the wrapping sidebar group. */
  class?: string;
  /** Extra CSS class appended to the underlying sidebar menu. */
  menuClass?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ResourceMenuItemGroup>` — a sidebar group of resource menu entries. The Vue
 * twin of `@chelone/react`'s `layout/resource-menu-item-group.tsx`. When
 * `resources` is omitted it reads the reactive `<Admin>` registry and renders one
 * `<ResourceMenuItem>` per list-enabled resource; the auto `<Menu>` uses it for
 * the (unlabeled) flat resource section.
 *
 * Vue divergence from the React twin: the Vue `ResourceDefinition` carries no
 * `options.group` bag yet, so there is no auto-grouping and a labeled group
 * renders a plain `<SidebarGroupLabel>` rather than a collapsible section (the
 * React twin's `<Collapsible>` has no Vue twin in this wave). The `label`/
 * `resources` props still let an author build explicit sections by hand. The
 * default slot adds entries after the resources, inside the group.
 */

import { computed } from "vue";
import { useResourceRegistry } from "../../../admin/resource-registry";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "../../ui/sidebar";
import ResourceMenuItem from "./resource-menu-item.vue";

const props = defineProps<ResourceMenuItemGroupProps>();

const registry = useResourceRegistry();

// Reading `Object.keys(registry.definitions)` tracks the shallow-reactive key
// set, so the group re-renders as `<Resource>`s register / unregister.
const names = computed(
  () =>
    props.resources ??
    Object.keys(registry.definitions).filter(
      (name) => registry.definitions[name]?.list != null,
    ),
);
</script>

<template>
  <SidebarGroup v-if="names.length > 0 || $slots.default" :class="props.class">
    <SidebarGroupLabel v-if="label">{{ label }}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu :class="menuClass">
        <ResourceMenuItem v-for="name in names" :key="name" :name="name" />
        <slot />
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
