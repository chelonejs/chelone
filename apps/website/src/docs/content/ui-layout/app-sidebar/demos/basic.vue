<script setup lang="ts">
import {
  AppSidebar,
  Menu,
  ResourceMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@chelone/vue";
</script>

<template>
  <!-- `<AppSidebar>` shows the brand and resource links in a collapsible sidebar. -->
  <SidebarProvider
    class="relative isolate min-h-80! w-full overflow-hidden rounded-md border [&_[data-slot=sidebar-inner]]:h-full!"
  >
    <!-- The preview's resources have no list view, which the default `<Menu>` lists, so the links are named here. -->
    <AppSidebar>
      <Menu>
        <ResourceMenuItem name="posts" />
        <ResourceMenuItem name="authors" />
      </Menu>
    </AppSidebar>
    <div class="flex-1 p-4">
      <SidebarTrigger />
      <p class="mt-4 text-sm text-muted-foreground">
        Browse posts and authors from the sidebar.
      </p>
    </div>
  </SidebarProvider>
</template>
