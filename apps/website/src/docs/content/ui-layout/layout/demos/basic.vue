<script setup lang="ts">
import { Layout } from "@chelone/vue";
</script>

<template>
  <!-- `<Layout>` shows the admin sidebar, app bar, and page content. The frame is fixed height, so the shell's own full-viewport heights are pinned to it. -->
  <div
    class="relative h-96 w-full overflow-hidden rounded-md border [contain:layout_paint] [&_[data-slot=layout-main]]:h-96 [&_[data-slot=sidebar-inner]]:h-96 [&_[data-slot=sidebar-wrapper]]:min-h-0"
  >
    <Layout>
      <h2 class="py-4 text-xl font-semibold">Posts</h2>
      <p>Select a resource in the sidebar to start managing records.</p>
    </Layout>
  </div>
</template>
