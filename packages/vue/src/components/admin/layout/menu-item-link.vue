<script lang="ts">
import type { Component } from "vue";

/** Props for {@link MenuItemLink}. */
export interface MenuItemLinkProps {
  /**
   * Target path for the link. Compared against the current location (via the
   * router `useMatch`) to derive the active-highlight state.
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
 * derived from `useMatch(to)`; when the current pathname matches `to`, the item
 * is highlighted. It is the building block for `<DashboardMenuItem>` /
 * `<ResourceMenuItem>` and for custom `<Menu>` children.
 *
 * Vue divergences from the React twin: the keyboard-shortcut binding and the
 * collapsed-rail `<Tooltip>` wrapper are NOT ported yet (those React
 * sub-components have no Vue twin in this wave) — a later surface-parity wave.
 * Navigation uses vue-router's `<RouterLink>` (the framework link), and `onClick`
 * is a prop invoked on click rather than a synthetic-event handler.
 */

import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { useMatch } from "../../../router";
import { SidebarMenuButton, SidebarMenuItem } from "../../ui/sidebar";

const props = defineProps<MenuItemLinkProps>();

const translate = useTranslate();
// `to` is a stable per-instance identity, so the match subscription is set up
// once; it stays reactive to the CURRENT route via the adapter's computed.
const match = useMatch({ path: props.to });
const isActive = computed(() => match.value != null);
const text = computed(() => translate(props.label, { _: props.label }));
</script>

<template>
  <SidebarMenuItem>
    <SidebarMenuButton
      :as="RouterLink"
      :to="to"
      :is-active="isActive"
      :class="class"
      @click="onClick?.()"
    >
      <component :is="icon" v-if="icon" />
      <slot name="icon" />
      <span>{{ text }}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
