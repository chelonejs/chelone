<script setup lang="ts">
/**
 * `<ResourceMenuItem>` is a sidebar link to the posts list: the label comes from
 * the resource, the icon from its registry entry, falling back to a list glyph.
 * The width sits on a wrapper because the Vue `cn` only joins classes, so a
 * `w-56` on the menu would sit beside the menu's own `w-full` and lose.
 */

import { ResourceMenuItem, SidebarMenu, SidebarProvider } from "@chelone/vue";
</script>

<template>
  <div class="w-56">
    <SidebarProvider>
      <SidebarMenu>
        <ResourceMenuItem name="posts" />
      </SidebarMenu>
    </SidebarProvider>
  </div>
</template>
