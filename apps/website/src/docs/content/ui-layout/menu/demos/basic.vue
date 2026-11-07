<script setup lang="ts">
import { Menu, Sidebar, SidebarContent, SidebarProvider } from "@chelone/vue";
</script>

<template>
  <!-- `<Menu>` lists every resource with a list view, here the preview's seeded `posts` and `authors`, as sidebar links. -->
  <SidebarProvider>
    <Sidebar collapsible="none" class="w-56">
      <SidebarContent>
        <Menu />
      </SidebarContent>
    </Sidebar>
  </SidebarProvider>
</template>
