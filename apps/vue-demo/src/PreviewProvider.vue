<script lang="ts">
/** How much admin context a docs demo needs; the Vue twin of the React `PreviewMode`. */
export type PreviewMode = "view" | "record" | "input";
</script>

<script setup lang="ts">
/**
 * `<PreviewProvider>` — the ambient admin context every docs demo renders
 * inside, the Vue twin of the website's React `preview-provider.tsx`. It wraps
 * the demo in `<Admin>` over a fresh in-memory data provider, with the `posts`
 * and `authors` resources registered, and with no layout: `#layout` replaces the
 * shell, so the demo is the whole page.
 *
 * The demo is not mounted at a route, so the resource is supplied by context
 * (`posts`, as in React). `mode` layers the rest, as in React:
 * - `view`: the demo is the view and renders as is.
 * - `record`: the first post is the ambient record, for a bare field.
 * - `input`: the demo sits in a `<Create>` form, titleless, for a bare input.
 */

import {
  type AuthProvider,
  createNotificationStore,
  createStore,
  fakeDataProvider,
} from "@chelone/core";
import { makeI18n, seedData } from "@chelone/demo-data";
import {
  Admin,
  Create,
  Edit,
  List,
  provideRecordContext,
  provideResourceContext,
  Resource,
  Show,
} from "@chelone/vue";
import { QueryClient } from "@tanstack/vue-query";
import { resources } from "./resources/schema";

const props = withDefaults(defineProps<{ mode?: PreviewMode }>(), {
  mode: "view",
});

// Per mount: the data provider mutates its seed, so a demo must not share it.
const seed = seedData();
const dataProvider = fakeDataProvider(seed);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    mutations: { retry: false },
  },
});
const i18n = makeI18n();
const notifications = createNotificationStore();
// `<ColumnsButton>` / `<FieldsSelector>` read the table's column choice from here.
const store = createStore();

// Signs every preview in as the first fixture author, so the components that act
// as a user (approve, reject) have someone to act as — as the React preview does.
const authProvider: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: 1, fullName: "Ada Lovelace" }),
};

provideResourceContext("posts");
if (props.mode === "record") provideRecordContext(seed.posts[0]);
</script>

<template>
  <Admin
    :data-provider="dataProvider"
    :auth-provider="authProvider"
    :query-client="queryClient"
    :registry="resources"
    :i18n="i18n"
    :notifications="notifications"
    :store="store"
  >
    <!-- `posts` is registered with all four views and `authors` with a list, so
         the sidebar `<Menu>` lists both — the Vue form of the React preview's
         `computeDefinition({ hasList: true, … })`. `#layout` below replaces the
         shell, so these views never mount: the demo is the whole page. -->
    <Resource
      name="posts"
      :list="List"
      :create="Create"
      :edit="Edit"
      :show="Show"
      record-representation="title"
    />
    <Resource name="authors" :list="List" record-representation="name" />
    <template #layout>
      <Create v-if="mode === 'input'" resource="posts" title="">
        <slot />
      </Create>
      <slot v-else />
    </template>
  </Admin>
</template>
