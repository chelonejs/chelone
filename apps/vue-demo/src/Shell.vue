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
  DataProviderDevtools,
  Layout,
  LocalesMenuButton,
  Menu,
  MenuItemLink,
  OnboardingTour,
  ThemeModeToggle,
  ThemeProvider,
  UserMenu,
} from "@chelone/vue";
import { Inspector, InspectorButton } from "@chelone/vue/inspector";
import { pageGroups } from "./pages";
import { dataProvider, dataProviderLog } from "./realtime";
import SearchButton from "./SearchButton.vue";
import TakeTheTour from "./TakeTheTour.vue";

// One transport and tool set for the app's lifetime: a new one starts a new conversation.
const assistantTransport = demoAssistantTransport();
const assistantTools = demoAssistantTools(dataProvider);
</script>

<template>
  <ThemeProvider>
    <CommandMenu>
      <Inspector>
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
          <router-view />
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
