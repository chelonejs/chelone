<script setup lang="ts">
/**
 * The Chelone Vue reference admin — the ONE canonical composition an app author
 * writes. `<Admin>` layers the whole provider stack (data / query / i18n /
 * resource-registry / router adapter) and each `<Resource>` declares its CRUD
 * views; `<Admin>` reactively builds the vue-router routes from them. Every view
 * is built from the `@chelone/vue` components over the in-memory
 * `fakeDataProvider`, wrapped for realtime (`realtime.ts`) — no server.
 *
 * The `#layout` slot is `Shell.vue`: the default `<Layout>` (a `<Sidebar>` with a
 * resource `<Menu>` linking each registered resource + an `<AppBar>` carrying
 * the page title and a `<UserMenu>`) plus a menu entry per file in `src/pages/`,
 * which `pages.ts` also turns into the custom routes. The routed view mounts in
 * the shell's main content area. The default slot holds the `<Resource>` markers
 * (they register and render no DOM).
 */

import { createNotificationStore } from "@chelone/core";
import { Admin, EditGuesser, ListGuesser, Resource, ShowGuesser } from "@chelone/vue";
import { MapsProvider } from "@chelone/vue/maps";
import { QueryClient } from "@tanstack/vue-query";
import { makeDemoAuthProvider, makeDemoStore } from "@chelone/demo-data";
import { i18n } from "./i18n";
import { mapsConfig } from "./maps-services";
import { pageRoutes } from "./pages";
import { dataProvider } from "./realtime";
import AuthorCreate from "./resources/AuthorCreate.vue";
import AuthorEdit from "./resources/AuthorEdit.vue";
import AuthorList from "./resources/AuthorList.vue";
import AuthorShow from "./resources/AuthorShow.vue";
import CustomerCreate from "./resources/CustomerCreate.vue";
import CustomerEdit from "./resources/CustomerEdit.vue";
import CustomerList from "./resources/CustomerList.vue";
import CustomerShow from "./resources/CustomerShow.vue";
import OrderCreate from "./resources/OrderCreate.vue";
import OrderEdit from "./resources/OrderEdit.vue";
import OrderList from "./resources/OrderList.vue";
import OrderShow from "./resources/OrderShow.vue";
import PlaceCreate from "./resources/PlaceCreate.vue";
import PlaceEdit from "./resources/PlaceEdit.vue";
import PlaceList from "./resources/PlaceList.vue";
import PlaceShow from "./resources/PlaceShow.vue";
import PageEdit from "./resources/PageEdit.vue";
import PageList from "./resources/PageList.vue";
import PageShow from "./resources/PageShow.vue";
import PostCreate from "./resources/PostCreate.vue";
import PostEdit from "./resources/PostEdit.vue";
import PostList from "./resources/PostList.vue";
import PostShow from "./resources/PostShow.vue";
import ProductCreate from "./resources/ProductCreate.vue";
import ProductEdit from "./resources/ProductEdit.vue";
import ProductList from "./resources/ProductList.vue";
import ProductShow from "./resources/ProductShow.vue";
import { resources } from "./resources/schema";
import Shell from "./Shell.vue";

// No hand-written views yet: the guessers build them from the schemas in
// resources/schema.ts.
const guessedResources = ["categories", "tags"];

// A retry-off query client and a notification store
// (the simulated user's failed lock reports through it) — the services a real
// app configures. Module scope keeps them stable for the app lifetime. The
// realtime data provider is built in `realtime.ts`.
const notifications = createNotificationStore();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 5 * 60 * 1000 },
    mutations: { retry: false },
  },
});
// Kept in `localStorage`, so the tour that opens on a first visit stays closed
// and the Team page's role and role matrix survive a reload. The auth provider
// answers every access check from them. `<MenuLive>` keeps its unread counts
// here too. The i18n instance is in ./i18n.
const store = makeDemoStore();
const authProvider = makeDemoAuthProvider(store);
</script>

<template>
  <!-- The map services every maps view reads: the public OpenStreetMap ones,
       which suit this demo only (see maps-services.ts). -->
  <MapsProvider v-bind="mapsConfig">
    <Admin
      :data-provider="dataProvider"
      :query-client="queryClient"
      :registry="resources"
      :i18n="i18n"
      :notifications="notifications"
      :store="store"
      :auth-provider="authProvider"
      :custom-routes="pageRoutes"
    >
      <template #layout><Shell /></template>
      <!-- QUICKSTART: `posts` carries a Zod schema (resources/schema.ts). The
           Edit/Create forms validate against it automatically (the D6
           registry-schema default validator). -->
      <Resource
        name="posts"
        :list="PostList"
        :edit="PostEdit"
        :create="PostCreate"
        :show="PostShow"
      />
      <Resource
        name="authors"
        :list="AuthorList"
        :edit="AuthorEdit"
        :create="AuthorCreate"
        :show="AuthorShow"
      />
      <Resource
        name="products"
        :list="ProductList"
        :edit="ProductEdit"
        :create="ProductCreate"
        :show="ProductShow"
      />
      <Resource
        name="customers"
        :list="CustomerList"
        :edit="CustomerEdit"
        :create="CustomerCreate"
        :show="CustomerShow"
      />
      <Resource
        name="orders"
        :list="OrderList"
        :edit="OrderEdit"
        :create="OrderCreate"
        :show="OrderShow"
      />
      <Resource
        name="places"
        :list="PlaceList"
        :edit="PlaceEdit"
        :create="PlaceCreate"
        :show="PlaceShow"
      />
      <Resource
        name="pages"
        :list="PageList"
        :edit="PageEdit"
        :show="PageShow"
      />
      <Resource
        v-for="name in guessedResources"
        :key="name"
        :name="name"
        :list="ListGuesser"
        :edit="EditGuesser"
        :show="ShowGuesser"
      />
    </Admin>
  </MapsProvider>
</template>
