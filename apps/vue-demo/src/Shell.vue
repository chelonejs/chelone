<script setup lang="ts">
/**
 * The app shell: the layout, its sidebar menu and what sits in it. A change to
 * the chrome edits this file only. The pages in `src/pages/` reach the menu
 * through `pages.ts`.
 *
 * `<Admin>` renders its default shell unless `#layout` is given, and a given
 * `#layout` stays bare, so this restores the theme and mounts the routed view.
 *
 * On every page: the command menu (Cmd+K or the Search button), the inspector
 * (the configure toggle), the assistant, the data provider devtools and the
 * welcome tour, which opens on a first visit and again from the user menu.
 */

import {
  demoAssistantTools,
  demoAssistantTransport,
  TOUR_ID,
  tourSteps,
} from "@chelone/demo-data";
import {
  AppBar,
  AppSidebar,
  Assistant,
  CommandMenu,
  DashboardMenuItem,
  DataProviderDevtools,
  Layout,
  LocalesMenuButton,
  Menu,
  MenuItemLink,
  MenuLive,
  OnboardingTour,
  ResourceMenuItemGroup,
  ThemeModeToggle,
  ThemeProvider,
  UserMenu,
  useBasename,
  useResourceDefinitions,
} from "@chelone/vue";
import { Inspector, InspectorButton } from "@chelone/vue/inspector";
import { computed } from "vue";
import { useRoute } from "vue-router";
import Dashboard from "./pages/Dashboard.vue";
import { pageGroups } from "./pages";
import SimulateOtherUser from "./realtime-sim.vue";
import { dataProvider, dataProviderLog } from "./realtime";
import SearchButton from "./SearchButton.vue";
import TakeTheTour from "./TakeTheTour.vue";

// One transport and tool set for the app's lifetime: a new one starts a new conversation.
const assistantTransport = demoAssistantTransport();
const assistantTools = demoAssistantTools(dataProvider);

// A `#layout` slot replaces the default shell, which is what renders the
// `#dashboard` slot at the index, so this shell renders the dashboard itself.
const route = useRoute();
const basename = useBasename();
const isIndex = computed(
  () => route.path.replace(/\/$/, "") === basename.replace(/\/$/, ""),
);

// Posts get a live unread badge; the other resources keep their plain links.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it. It sits at the
// top of the sidebar: at the bottom it scrolls under the devtools panel.
const definitions = useResourceDefinitions();
const others = computed(() =>
  Object.keys(definitions).filter(
    (name) => name !== "posts" && definitions[name]?.list != null,
  ),
);
</script>

<template>
  <ThemeProvider>
    <CommandMenu>
      <Inspector>
        <Layout>
          <template #sidebar>
            <AppSidebar>
              <div class="px-2 pt-2">
                <MenuLive
                  :items="[{ to: '/posts', resource: 'posts', label: 'Posts' }]"
                />
              </div>
              <div class="px-4 py-2">
                <SimulateOtherUser />
              </div>
              <Menu><DashboardMenuItem /></Menu>
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
            </AppSidebar>
          </template>
          <template #app-bar>
            <AppBar>
              <template #toolbar>
                <SearchButton />
                <InspectorButton data-tour="configure" />
                <LocalesMenuButton />
                <ThemeModeToggle />
              </template>
              <template #user-menu>
                <UserMenu>
                  <TakeTheTour />
                </UserMenu>
              </template>
            </AppBar>
          </template>
          <Dashboard v-if="isIndex" />
          <router-view v-else />
        </Layout>
        <OnboardingTour :id="TOUR_ID" :steps="tourSteps" />
        <Assistant
          :transport="assistantTransport"
          :tools="assistantTools"
          welcome-message="Hi! Ask me how many posts there are."
        />
        <DataProviderDevtools
          :log="dataProviderLog"
          :default-open="false"
          class="right-auto left-4"
        />
      </Inspector>
    </CommandMenu>
  </ThemeProvider>
</template>
