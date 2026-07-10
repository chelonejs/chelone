<script setup lang="ts">
/**
 * `<Layout>` — the default admin shell frame. The Vue twin of `@chelone/react`'s
 * `layout/layout.tsx`. Wraps a `<SidebarProvider>` around the `<AppSidebar>` and
 * a `<main>` content column (`<AppBar>` + the routed content), so `<Admin>`
 * renders it as the default `#layout` when no override is supplied.
 *
 * The default slot is the routed content (`<Admin>` injects its dashboard slot +
 * `<router-view>` there). The `#sidebar` / `#app-bar` slots override the sidebar
 * and header for a custom shell without re-implementing the frame.
 *
 * Vue divergences from the React twin: no `<Notification>` toaster (a feedback-
 * wave component) and no error boundary yet — the content mounts directly. The
 * `#main-content` anchor is kept for a future skip-nav target.
 */

import AppBar from "./app-bar.vue";
import AppSidebar from "./app-sidebar.vue";
import { SidebarProvider } from "../../ui/sidebar";
</script>

<template>
  <SidebarProvider>
    <slot name="sidebar">
      <AppSidebar />
    </slot>
    <main
      id="main-content"
      data-slot="layout-main"
      class="ml-auto flex h-svh w-full max-w-full flex-1 flex-col"
    >
      <slot name="app-bar">
        <AppBar />
      </slot>
      <div class="flex flex-1 flex-col overflow-auto px-4 py-2">
        <slot />
      </div>
    </main>
  </SidebarProvider>
</template>
