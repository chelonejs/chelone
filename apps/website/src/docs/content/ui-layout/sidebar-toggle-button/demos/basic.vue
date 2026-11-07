<script setup lang="ts">
/**
 * `<SidebarToggleButton>` opens and closes the sidebar of the
 * `<SidebarProvider>` it sits in. The padding keeps room for the button's mobile
 * scale-up, which the narrow preview frame applies: at this width the button is
 * 45px wide and would otherwise sit clipped against the frame's corner.
 */

import { SidebarProvider, SidebarToggleButton } from "@chelone/vue";
</script>

<template>
  <SidebarProvider class="p-2">
    <SidebarToggleButton />
  </SidebarProvider>
</template>
