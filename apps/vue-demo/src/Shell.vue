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
  MenuLive,
  ResourceMenuItemGroup,
  ThemeProvider,
  useResourceDefinitions,
} from "@chelone/vue";
import { computed } from "vue";
import { pageGroups } from "./pages";
import SimulateOtherUser from "./realtime-sim.vue";

// Posts get a live unread badge; the other resources keep their plain links.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it.
const definitions = useResourceDefinitions();
const others = computed(() =>
  Object.keys(definitions).filter(
    (name) => name !== "posts" && definitions[name]?.list != null,
  ),
);
</script>

<template>
  <ThemeProvider>
    <Layout>
      <template #sidebar>
        <AppSidebar>
          <div class="px-2 pt-2">
            <MenuLive
              :items="[{ to: '/posts', resource: 'posts', label: 'Posts' }]"
            />
          </div>
          <ResourceMenuItemGroup :resources="others" />
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
          <div class="px-4 pt-2">
            <SimulateOtherUser />
          </div>
        </AppSidebar>
      </template>
      <router-view />
    </Layout>
  </ThemeProvider>
</template>
