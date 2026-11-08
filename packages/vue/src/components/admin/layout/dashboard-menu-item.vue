<script lang="ts">
import type { Component } from "vue";

/** Props for {@link DashboardMenuItem}. */
export interface DashboardMenuItemProps {
  /** Extra CSS class appended to the underlying menu button. */
  class?: string;
  /** Replaces the default `House` icon. */
  icon?: Component;
  /** Replaces the default translated label (`chelone.page.dashboard`, default "Dashboard"). */
  label?: string;
  /** Click handler invoked alongside the default navigation (e.g. close the drawer). */
  onClick?: () => void;
}
</script>

<script setup lang="ts">
/**
 * `<DashboardMenuItem>` — the sidebar entry linking to the dashboard (`/`). The
 * Vue twin of `@chelone/react`'s `layout/dashboard-menu-item.tsx`. The default
 * `<Menu>` renders it when an `<Admin>` was given a `#dashboard` slot (via
 * `useHasDashboard`). Composes `<MenuItemLink>` for the link + active-highlight.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useBasename } from "../../../router";
import { HouseIcon } from "./icons";
import MenuItemLink from "./menu-item-link.vue";

const props = defineProps<DashboardMenuItemProps>();

const translate = useTranslate();
const basename = useBasename();
const to = `${basename}/`;
const label = computed(
  () => props.label ?? translate("chelone.page.dashboard", { _: "Dashboard" }),
);
const icon = computed(() => props.icon ?? HouseIcon);
</script>

<template>
  <MenuItemLink
    :to="to"
    :label="label"
    :icon="icon"
    :class="props.class"
    :on-click="onClick"
  />
</template>
