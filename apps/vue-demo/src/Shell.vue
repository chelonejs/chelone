<script setup lang="ts">
/**
 * The app shell: the layout, its sidebar menu and what sits in it. A change to
 * the chrome edits this file only. The pages in `src/pages/` reach the menu
 * through `pages.ts`.
 *
 * `<Admin>` renders its default shell unless `#layout` is given, and a given
 * `#layout` stays bare, so this restores the theme and mounts the routed view.
 */

import {
  AppSidebar,
  Layout,
  Menu,
  MenuItemLink,
  ThemeProvider,
} from "@chelone/vue";
import { pageGroups } from "./pages";
</script>

<template>
  <ThemeProvider>
    <Layout>
      <template #sidebar>
        <AppSidebar>
          <Menu />
          <section v-for="{ group, pages } in pageGroups" :key="group">
            <h2 class="px-4 pt-2 text-xs font-medium text-muted-foreground">
              {{ group }}
            </h2>
            <Menu>
              <MenuItemLink
                v-for="{ path, title } in pages"
                :key="path"
                :to="`/${path}`"
                :label="title"
              />
            </Menu>
          </section>
        </AppSidebar>
      </template>
      <router-view />
    </Layout>
  </ThemeProvider>
</template>
