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
 * `<main id="main-content">` is the target of the `<SkipNavigationButton>` that
 * opens it, ahead of the app bar.
 *
 * Vue divergence from the React twin: no error boundary yet — the content
 * mounts directly.
 */

import AppBar from "./app-bar.vue";
import AppSidebar from "./app-sidebar.vue";
import SkipNavigationButton from "../buttons/skip-navigation-button.vue";
import Notification from "../feedback/notification.vue";
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
      <SkipNavigationButton />
      <slot name="app-bar">
        <AppBar />
      </slot>
      <div class="flex flex-1 flex-col overflow-auto px-4 py-2">
        <slot />
      </div>
    </main>
    <Notification />
  </SidebarProvider>
</template>
