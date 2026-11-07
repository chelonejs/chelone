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
  demoMenuKey,
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
  HideOnScroll,
  IconButtonWithTooltip,
  Layout,
  LoadingIndicator,
  LocalesMenuButton,
  Menu,
  MenuItemLink,
  MenuLive,
  OnboardingTour,
  ResourceMenuItemGroup,
  SidebarToggleButton,
  ThemeModeToggle,
  ThemeProvider,
  UserMenu,
  useBasename,
  useGetResourceLabel,
  useTranslate,
} from "@chelone/vue";
import { Inspector, InspectorButton } from "@chelone/vue/inspector";
import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  HeartPulse,
  KeyRound,
  Layers,
  LayoutTemplate,
  LogIn,
  Newspaper,
  Plug,
  SquareKanban,
  UserCog,
} from "lucide-vue-next";
import { type Component, computed, h } from "vue";
import { START_LOCATION, useRoute, useRouter } from "vue-router";
import AccessGuard from "./AccessGuard.vue";
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
// Before the first navigation settles the router sits on `START_LOCATION`,
// whose path is also `/`, so a deep link would flash the dashboard.
// `useRoute()` wraps the location in a proxy, so compare the router's own object.
const route = useRoute();
const router = useRouter();
const basename = useBasename();
const isIndex = computed(
  () =>
    router.currentRoute.value !== START_LOCATION &&
    route.path.replace(/\/$/, "") === basename.replace(/\/$/, ""),
);

// The area each resource sits under. A resource missing here is not in the menu.
const resourceAreas: Record<string, string[]> = {
  Catalog: ["products"],
  Content: ["pages", "categories", "tags"],
  Orders: ["orders"],
  Shop: ["customers", "places"],
  Team: ["authors"],
};

const areas = [
  ...new Set([...Object.keys(resourceAreas), ...pageGroups.map((g) => g.group)]),
]
  .sort((a, b) => a.localeCompare(b))
  .map((area) => ({
    area,
    resources: resourceAreas[area],
    pages: pageGroups.find((g) => g.group === area)?.pages ?? [],
  }));

// MenuLive draws its icon with no props, so the size is set here: the menu's own
// items size theirs in CSS.
const PostsIcon = () => h(Newspaper, { size: 16, class: "shrink-0" });

// One glyph per page, by file name. A page missing here shows none, which the
// sidebar test catches. Dashboard and the resources have theirs elsewhere (the
// menu's house, each `<Resource icon>`).
const pageIcons: Record<string, Component> = {
  Activity,
  Approvals: ClipboardCheck,
  Integrations: Plug,
  LandingPage: LayoutTemplate,
  Login: LogIn,
  OrderBoard: SquareKanban,
  OrderCalendar: CalendarDays,
  ProductVariants: Layers,
  Status: HeartPulse,
  SupabaseAuth: KeyRound,
  Team: UserCog,
};

// Mod+1 to mod+9 open the first nine pages, in menu order.
const shortcuts = new Map(
  areas
    .flatMap(({ pages }) => pages)
    .slice(0, 9)
    .map(({ path }, index) => [path, `mod+${index + 1}`]),
);

// The docs live beside the demo on the deployed site, so a new tab keeps the app open.
function openDocs() {
  window.open("/docs/", "_blank", "noopener");
}

// The mark sits in this app's own public/ folder, so its URL carries Vite's base
// (`/vue-demo/`) rather than pointing at the website's copy. The brand links home
// with `brand-href`, a plain anchor: `brand-to` is a router link and would prefix
// the basename.
const logoSrc = `${import.meta.env.BASE_URL}chelone-mark.svg`;

const translate = useTranslate();
const getResourceLabel = useGetResourceLabel();
/** A demo string in the current locale, with the English text as its default. */
const t = (key: string, english: string) => translate(key, { _: english });

// Posts get a live unread badge; the other resources sit under their area.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it. It sits at the
// top of the sidebar: at the bottom it scrolls under the devtools panel.
</script>

<template>
  <ThemeProvider>
    <CommandMenu>
      <Inspector>
        <Layout>
          <template #sidebar>
            <AppSidebar brand-href="/">
              <template #brand-icon>
                <img :src="logoSrc" alt="" width="20" height="20" />
              </template>
              <div class="px-2 pt-2">
                <MenuLive
                  :items="[
                    {
                      to: '/posts',
                      resource: 'posts',
                      label: getResourceLabel('posts'),
                      icon: PostsIcon,
                    },
                  ]"
                />
              </div>
              <div class="px-4 py-2">
                <SimulateOtherUser />
              </div>
              <Menu><DashboardMenuItem /></Menu>
              <ResourceMenuItemGroup
                v-for="{ area, resources, pages } in areas"
                :key="area"
                :label="t(demoMenuKey('group', area), area)"
                :resources="resources ?? []"
              >
                <MenuItemLink
                  v-for="{ path, title } in pages"
                  :key="path"
                  :to="`/${path}`"
                  :label="t(demoMenuKey('page', path), title)"
                  :icon="pageIcons[path]"
                  :keyboard-shortcut="shortcuts.get(path)"
                />
              </ResourceMenuItemGroup>
            </AppSidebar>
          </template>
          <template #app-bar>
            <!-- Sticky, so that hiding the bar on scroll has something to hide. index.css lets the page scroll under it. -->
            <HideOnScroll class="demo-app-bar sticky top-0 z-20 bg-background">
              <AppBar>
                <template #start>
                  <SidebarToggleButton />
                </template>
                <template #toolbar>
                  <SearchButton />
                  <InspectorButton data-tour="configure" />
                  <IconButtonWithTooltip label="Documentation" @click="openDocs">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 7v14" />
                      <path
                        d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
                      />
                    </svg>
                  </IconButtonWithTooltip>
                  <LoadingIndicator class="mx-2" />
                  <LocalesMenuButton />
                  <ThemeModeToggle />
                </template>
                <template #user-menu>
                  <UserMenu>
                    <TakeTheTour />
                  </UserMenu>
                </template>
              </AppBar>
            </HideOnScroll>
          </template>
          <Dashboard v-if="isIndex" />
          <AccessGuard v-else><router-view /></AccessGuard>
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
