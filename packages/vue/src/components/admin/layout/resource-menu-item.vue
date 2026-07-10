<script lang="ts">
import type { Component } from "vue";

/** Props for {@link ResourceMenuItem}. */
export interface ResourceMenuItemProps {
  /** The resource name (matches a `<Resource name>` registered in `<Admin>`). */
  name: string;
  /** Override the label. Defaults to the pluralized resource label. */
  label?: string;
  /** Override the icon. Defaults to the resource's registry icon or a list glyph. */
  icon?: Component;
  /** Extra CSS class appended to the underlying menu button. */
  class?: string;
  /** Click handler invoked alongside the default navigation (e.g. close the drawer). */
  onClick?: () => void;
}
</script>

<script setup lang="ts">
/**
 * `<ResourceMenuItem>` — a sidebar entry linking to a resource's list view. The
 * Vue twin of `@chelone/react`'s `layout/resource-menu-item.tsx`. Resolves the
 * list path via `useCreatePath`, the label via `useGetResourceLabel`, and the
 * icon from the resource's registry definition (falling back to an inline list
 * glyph), then delegates to `<MenuItemLink>` for the link + active-highlight.
 *
 * Each item resolves its OWN path in its OWN setup (not in the `<Menu>` `v-for`
 * loop) — the Vue rule that composables run once per component instance,
 * mirroring the React twin being a discrete component per resource.
 *
 * Vue divergences from the React twin: no `useMenuAccess` auth gate and no
 * loading `<Skeleton>` (the Vue adapter has no auth wave yet), and the
 * `_scrollToTop` navigation state is deferred to the scroll-manager wave.
 */

import { computed } from "vue";
import { useResourceRegistry } from "../../../admin/resource-registry";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useCreatePath } from "../../../router";
import { ListIcon } from "./icons";
import MenuItemLink from "./menu-item-link.vue";

const props = defineProps<ResourceMenuItemProps>();

const registry = useResourceRegistry();
const createPath = useCreatePath();
const getResourceLabel = useGetResourceLabel();

// The name is a stable identity for the item, so the path is computed once.
const to = createPath({ resource: props.name, type: "list" });
const label = computed(() => props.label ?? getResourceLabel(props.name, 2));
const icon = computed(
  () => props.icon ?? registry.definitions[props.name]?.icon ?? ListIcon,
);
</script>

<template>
  <MenuItemLink
    :to="to"
    :label="label"
    :icon="icon"
    :class="class"
    :on-click="onClick"
  />
</template>
