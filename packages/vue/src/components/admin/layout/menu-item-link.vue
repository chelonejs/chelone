<script lang="ts">
import type { Component } from "vue";

/** Props for {@link MenuItemLink}. */
export interface MenuItemLinkProps {
  /**
   * Target path for the link. Compared against the current location (via the
   * router `useMatch`) to derive the active-highlight state. Resource-list
   * entries match with `end: false`, so the parent stays highlighted on a child
   * detail route (`/posts` active on `/posts/:id`); the dashboard/root link
   * (`${basename}/`) matches exactly.
   */
  to: string;
  /**
   * The text rendered alongside `icon`. Auto-translated via `useTranslate` with
   * the string itself as the fallback, so an already-resolved label (e.g. a
   * humanized resource name) echoes through unchanged.
   */
  label: string;
  /** Icon component rendered before the label. Provide via the `#icon` slot instead for markup. */
  icon?: Component;
  /** Extra CSS class appended to the underlying `<SidebarMenuButton>`. */
  class?: string;
  /** Click handler invoked alongside the default navigation (e.g. close the mobile drawer). */
  onClick?: () => void;
}
</script>

<script setup lang="ts">
/**
 * `<MenuItemLink>` — a clickable sidebar entry that navigates to a route. The Vue
 * twin of `@chelone/react`'s `layout/menu-item-link.tsx`. The active state is
 * derived from `useMatch({ path: to, end: to === `${basename}/` })` (mirroring
 * the React twin); when the current pathname matches `to`, the item is
 * highlighted, and — because non-root links match with `end: false` — the
 * parent list entry stays highlighted on its child detail routes. It is the
 * building block for `<DashboardMenuItem>` / `<ResourceMenuItem>` and for custom
 * `<Menu>` children.
 *
 * Vue divergences from the React twin: the keyboard-shortcut binding and the
 * collapsed-rail `<Tooltip>` wrapper are NOT ported yet (those React
 * sub-components have no Vue twin in this wave) — a later surface-parity wave.
 * Navigation uses vue-router's `<RouterLink>` (the framework link), and `onClick`
 * is a prop invoked on click rather than a synthetic-event handler.
 */

import { computed, inject } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { useBasename, useMatch } from "../../../router";
import {
  SidebarContextKey,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../ui/sidebar";

const props = defineProps<MenuItemLinkProps>();

// Optional: a menu item can render outside a `<SidebarProvider>` (a custom shell).
const sidebar = inject(SidebarContextKey, null);

const translate = useTranslate();
const basename = useBasename();
// Mirror the React twin `useMatch({ path: to, end: to === `${basename}/` })`:
// resource-list items match with `end: false` so the parent entry stays active
// on a child detail route (`/posts` highlighted on `/posts/:id`); only the
// dashboard/root link (`${basename}/`) matches exactly. `to` is a stable
// per-instance identity, so the subscription is set up once and stays reactive
// to the CURRENT route via the adapter's computed.
const match = useMatch({ path: props.to, end: props.to === `${basename}/` });
const isActive = computed(() => match.value != null);
const text = computed(() => translate(props.label, { _: props.label }));

function onClick(): void {
  props.onClick?.();
  if (sidebar?.openMobile.value) sidebar.setOpenMobile(false);
}
</script>

<template>
  <SidebarMenuItem>
    <SidebarMenuButton
      :as="RouterLink"
      :to="to"
      :is-active="isActive"
      :class="props.class"
      @click="onClick"
    >
      <component :is="icon" v-if="icon" />
      <slot name="icon" />
      <span>{{ text }}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
