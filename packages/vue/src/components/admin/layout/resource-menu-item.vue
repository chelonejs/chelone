<script lang="ts">
/** Props for {@link ResourceMenuItem}. */
export interface ResourceMenuItemProps {
  /** The resource name (matches a `<Resource name>` registered in `<Admin>`). */
  name: string;
}
</script>

<script setup lang="ts">
/**
 * `<ResourceMenuItem>` — a sidebar entry linking to a resource's list view. The
 * Vue twin of `@chelone/react`'s `layout/resource-menu-item.tsx`. Resolves the
 * list path via `useCreatePath`, the active state via `useMatch`, the label via
 * `useGetResourceLabel`, and the icon from the resource's registry definition
 * (falling back to an inline list glyph).
 *
 * Each item computes its own path/match in its OWN setup (not in a `v-for` loop
 * in `<Menu>`) — the Vue rule that composables run once per component instance,
 * mirroring the React twin being a discrete component per resource.
 */

import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useResourceRegistry } from "../../../admin/resource-registry";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useCreatePath, useMatch } from "../../../router";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../ui/sidebar";

const props = defineProps<ResourceMenuItemProps>();

const registry = useResourceRegistry();
const createPath = useCreatePath();
const getResourceLabel = useGetResourceLabel();

// The name is a stable identity for the item, so the path is computed once.
const to = createPath({ resource: props.name, type: "list" });
const match = useMatch({ path: to });
const isActive = computed(() => match.value != null);

const label = computed(() => getResourceLabel(props.name, 2));
const icon = computed(() => registry.definitions[props.name]?.icon);
</script>

<template>
  <SidebarMenuItem>
    <SidebarMenuButton :as="RouterLink" :to="to" :is-active="isActive">
      <component :is="icon" v-if="icon" />
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12h.01M3 18h.01M3 6h.01M8 6h13M8 12h13M8 18h13" />
      </svg>
      <span>{{ label }}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
