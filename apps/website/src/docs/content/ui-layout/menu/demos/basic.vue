<script setup lang="ts">
import { Menu, Sidebar, SidebarContent, SidebarProvider } from "@chelone/vue";
</script>

<template>
  <!-- `<Menu>` lists every resource with a list view, here the preview's seeded `posts` and `authors`, as sidebar links. The frame sizes itself to this demo, so the shell's full-viewport heights are dropped: a sidebar one screen tall would be exactly as tall as the frame it sits in. -->
  <div
    class="[&_[data-slot=sidebar-inner]]:h-auto [&_[data-slot=sidebar-wrapper]]:min-h-0"
  >
    <SidebarProvider>
      <Sidebar collapsible="none" class="w-56">
        <SidebarContent>
          <Menu />
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  </div>
</template>
