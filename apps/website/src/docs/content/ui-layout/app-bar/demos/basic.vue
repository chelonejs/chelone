<script setup lang="ts">
import { AppBar, SidebarProvider, Title } from "@chelone/vue";
</script>

<template>
  <!-- `<AppBar>` shows a sidebar toggle, page title, and theme menu. The preview has no signed-in user, so its user menu renders nothing. -->
  <SidebarProvider>
    <AppBar class="w-full rounded-md border" />
    <Title title="Posts" />
  </SidebarProvider>
</template>
