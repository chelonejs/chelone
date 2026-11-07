<script setup lang="ts">
/**
 * `<ResourceMenuItemGroup>` is a "Content" sidebar section linking to the posts
 * and authors lists. The React twin's group collapses; the Vue group renders its
 * label and open menu directly. The width sits on a wrapper because the Vue `cn`
 * only joins classes, so a `w-56` on the group would sit beside its own `w-full`
 * and lose.
 */

import { ResourceMenuItemGroup, SidebarProvider } from "@chelone/vue";
</script>

<template>
  <div class="w-56">
    <SidebarProvider>
      <ResourceMenuItemGroup label="Content" :resources="['posts', 'authors']" />
    </SidebarProvider>
  </div>
</template>
