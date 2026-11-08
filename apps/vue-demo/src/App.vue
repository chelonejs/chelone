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
import {
  AccessDenied,
  Admin,
  AuthCallback,
  AuthenticationError,
  EditGuesser,
  ListGuesser,
  LoginPage,
  NotFound,
  Resource,
  ShowGuesser,
} from "@chelone/vue";
import { MapsProvider } from "@chelone/vue/maps";
import { QueryClient } from "@tanstack/vue-query";
import {
  FileText,
  FolderTree,
  MapPin,
  Newspaper,
  Package,
  PenLine,
  ShoppingCart,
  Tags,
  Users,
} from "lucide-vue-next";
import { makeDemoAuthProvider, makeDemoStore } from "@chelone/demo-data";
import { authRoutes } from "./auth-routes";
import { i18n } from "./i18n";
import { mapsConfig } from "./maps-services";
import { pageRoutes } from "./pages";
import { dataProvider } from "./realtime";
import AuthorCreate from "./resources/AuthorCreate.vue";
import AuthorEdit from "./resources/AuthorEdit.vue";
import AuthorList from "./resources/AuthorList.vue";
import AuthorShow from "./resources/AuthorShow.vue";
import CategoryEdit from "./resources/CategoryEdit.vue";
import CategoryList from "./resources/CategoryList.vue";
import CategoryShow from "./resources/CategoryShow.vue";
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

// The Supabase auth pages render outside the layout (see auth-routes.ts); the
// files in `src/pages/` render inside it.
const customRoutes = [...authRoutes, ...pageRoutes];

// No hand-written views yet: the guessers build them from the schemas in
// resources/schema.ts.
const guessedResources = [{ name: "tags", icon: Tags }] as const;

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
// and the Team page's role, role matrix and sign-in survive a reload. The auth
// provider answers every access check from them, and resets the query client's
// cached answers when someone signs in or out. `<MenuLive>` keeps its unread counts
// here too. The i18n instance is in ./i18n.
const store = makeDemoStore();
const authProvider = makeDemoAuthProvider(store, queryClient);
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
      :custom-routes="customRoutes"
      require-auth
    >
      <template #layout><Shell /></template>
      <!-- Shell.vue renders the dashboard, since a #layout slot replaces the
           shell that would. This empty slot keeps the index from redirecting to
           the first resource. -->
      <template #dashboard />
      <!-- Shown in place of the app while nobody is signed in: log out from the
           user menu to see it. Any email and password sign in. -->
      <template #login><LoginPage /></template>
      <!-- Where an OAuth provider sends the visitor back: /auth-callback with a
           code signs in, with an error shows <AuthError>. It renders outside
           the layout, so the wrapper gives it a page to centre in. -->
      <template #authCallback>
        <div class="flex min-h-svh flex-col justify-center">
          <AuthCallback />
        </div>
      </template>
      <!-- /access-denied is where a role that may not open a page lands, as the
           Team page's viewer does on /posts/create. -->
      <template #accessDenied><AccessDenied /></template>
      <template #authenticationError><AuthenticationError /></template>
      <!-- A URL no route owns, such as /nowhere. -->
      <template #catchAll><NotFound /></template>
      <!-- QUICKSTART: `posts` carries a Zod schema (resources/schema.ts). The
           Edit/Create forms validate against it automatically (the D6
           registry-schema default validator). -->
      <Resource
        name="posts"
        :icon="Newspaper"
        :list="PostList"
        :edit="PostEdit"
        :create="PostCreate"
        :show="PostShow"
      />
      <Resource
        name="authors"
        :icon="PenLine"
        :list="AuthorList"
        :edit="AuthorEdit"
        :create="AuthorCreate"
        :show="AuthorShow"
      />
      <Resource
        name="products"
        :icon="Package"
        :list="ProductList"
        :edit="ProductEdit"
        :create="ProductCreate"
        :show="ProductShow"
      />
      <Resource
        name="customers"
        :icon="Users"
        :list="CustomerList"
        :edit="CustomerEdit"
        :create="CustomerCreate"
        :show="CustomerShow"
      />
      <Resource
        name="orders"
        :icon="ShoppingCart"
        :list="OrderList"
        :edit="OrderEdit"
        :create="OrderCreate"
        :show="OrderShow"
      />
      <Resource
        name="places"
        :icon="MapPin"
        :list="PlaceList"
        :edit="PlaceEdit"
        :create="PlaceCreate"
        :show="PlaceShow"
      />
      <Resource
        name="pages"
        :icon="FileText"
        :list="PageList"
        :edit="PageEdit"
        :show="PageShow"
      />
      <Resource
        name="categories"
        :icon="FolderTree"
        record-representation="name.en"
        :list="CategoryList"
        :edit="CategoryEdit"
        :show="CategoryShow"
      />
      <Resource
        v-for="{ name, icon } in guessedResources"
        :key="name"
        :name="name"
        :icon="icon"
        :list="ListGuesser"
        :edit="EditGuesser"
        :show="ShowGuesser"
      />
    </Admin>
  </MapsProvider>
</template>
