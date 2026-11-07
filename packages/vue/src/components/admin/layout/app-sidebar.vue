<script lang="ts">
/** Props for {@link AppSidebar}. */
export interface AppSidebarProps {
  /**
   * Brand label in the sidebar header. Defaults to `"Chelone"`. The `#brand`
   * slot replaces it.
   */
  brand?: string;
  /**
   * Where the brand links to, used as given (not prefixed with the basename).
   * Defaults to the dashboard under the basename.
   */
  brandTo?: string;
  /**
   * Where the brand links to as a plain anchor, with no router and no basename
   * prefix: for a link out of the app, such as the site home. Wins over
   * `brandTo`. A `javascript:` or other unsafe scheme renders no `href`.
   */
  brandHref?: string;
}
</script>

<script setup lang="ts">
/**
 * `<AppSidebar>` — the navigation sidebar: a brand header, the resource `<Menu>`,
 * and a footer. The Vue twin of `@chelone/react`'s `layout/app-sidebar.tsx`.
 * The brand icon defaults to an inline `Shell` glyph (overridable via the
 * `#brand-icon` slot, and the label by the `#brand` slot); the content defaults to `<Menu>` (overridable via the
 * default slot for a fully custom nav tree).
 */

import { isSafeLinkUrl } from "@chelone/core";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useBasename } from "../../../router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../ui/sidebar";
import Menu from "./menu.vue";

const props = withDefaults(defineProps<AppSidebarProps>(), {
  brand: "Chelone",
});

const basename = useBasename();
const link = computed(() =>
  props.brandHref === undefined
    ? { as: RouterLink, to: props.brandTo ?? `${basename}/` }
    : {
        as: "a",
        href: isSafeLinkUrl(props.brandHref) ? props.brandHref : undefined,
      },
);
</script>

<template>
  <Sidebar variant="floating" collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton v-bind="link" size="lg">
            <slot name="brand-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-5"
                aria-hidden="true"
              >
                <path d="M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44" />
              </svg>
            </slot>
            <span class="text-base font-semibold">
              <slot name="brand">{{ brand }}</slot>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <slot>
        <Menu />
      </slot>
    </SidebarContent>
    <SidebarFooter />
  </Sidebar>
</template>
