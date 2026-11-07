<script setup lang="ts">
/**
 * `<DemoSidebar>` — the demo's sidebar frame: the `<AppSidebar>` chrome with the
 * site's own brand. The mark and the `Chelone` name link back to the site home,
 * not to this app's dashboard, so the demos read as part of one site.
 *
 * The brand is a plain anchor, not a `RouterLink`: this app is served under
 * `/vue-demo/`, and a router link would prefix `/` with that basename and stay
 * inside the demo. The default slot holds the menu, as in `<AppSidebar>`.
 */

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@chelone/vue";

// The mark sits in this app's own public/ folder, so its URL carries Vite's base
// (`/vue-demo/`) rather than pointing at the website's copy.
const logoSrc = `${import.meta.env.BASE_URL}chelone-mark.svg`;
</script>

<template>
  <Sidebar variant="floating" collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as="a" href="/" size="lg">
            <img :src="logoSrc" alt="" width="20" height="20" />
            <span class="text-base font-semibold">Chelone</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <slot />
    </SidebarContent>
    <SidebarFooter />
  </Sidebar>
</template>
