<script setup lang="ts">
import { DashboardMenuItem, Menu, SidebarProvider } from "@chelone/vue";
</script>

<template>
  <!-- `<DashboardMenuItem>` shows a home icon and a link to the dashboard. The
       provider's `cn` does not merge conflicting classes, so the width sits on
       a wrapper and `min-h-0!` beats its `min-h-svh`. -->
  <div class="w-60 rounded-md border">
    <SidebarProvider class="min-h-0!">
      <Menu>
        <DashboardMenuItem />
      </Menu>
    </SidebarProvider>
  </div>
</template>
