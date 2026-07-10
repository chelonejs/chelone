<script setup lang="ts">
/**
 * The Chelone Vue reference admin — the ONE canonical composition an app author
 * writes. `<Admin>` layers the whole provider stack (data / query / i18n /
 * resource-registry / router adapter) and each `<Resource>` declares its CRUD
 * views; `<Admin>` reactively builds the vue-router routes from them. Every view
 * is built from the `@chelone/vue` components over the in-memory
 * `fakeDataProvider` — no server.
 *
 * The `#layout` slot supplies the demo's chrome (a nav bar + `<router-view />`);
 * it WINS over `<Admin>`'s default fallback, so the demo owns where the routed
 * page renders. The default slot holds the `<Resource>` markers (they register
 * and render no DOM).
 */

import { fakeDataProvider } from "@chelone/core";
import { Admin, Resource } from "@chelone/vue";
import { QueryClient } from "@tanstack/vue-query";
import { makeI18n } from "./i18n";
import AuthorList from "./resources/AuthorList.vue";
import PostCreate from "./resources/PostCreate.vue";
import PostEdit from "./resources/PostEdit.vue";
import PostList from "./resources/PostList.vue";
import { resources } from "./resources/schema";
import { seedData } from "./seed";

// The in-memory provider, seeded once (it mutates its data in place), plus a
// retry-off query client and the English i18n catalog — the services a real app
// configures. Module scope keeps them stable for the app lifetime.
const dataProvider = fakeDataProvider(seedData());
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 5 * 60 * 1000 },
    mutations: { retry: false },
  },
});
const i18n = makeI18n();
</script>

<template>
  <Admin
    :data-provider="dataProvider"
    :query-client="queryClient"
    :registry="resources"
    :i18n="i18n"
  >
    <!-- QUICKSTART: `posts` carries a Zod schema (resources/schema.ts). The
         Edit/Create forms validate against it automatically (the D6
         registry-schema default validator). -->
    <Resource
      name="posts"
      :list="PostList"
      :edit="PostEdit"
      :create="PostCreate"
    />
    <Resource name="authors" :list="AuthorList" />

    <template #layout>
      <div class="min-h-screen">
        <header class="border-b">
          <nav
            class="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 text-sm"
          >
            <span class="font-semibold">Chelone · Vue</span>
            <RouterLink
              to="/posts"
              class="text-muted-foreground hover:text-foreground"
            >
              Posts
            </RouterLink>
            <RouterLink
              to="/authors"
              class="text-muted-foreground hover:text-foreground"
            >
              Authors
            </RouterLink>
            <RouterLink
              to="/posts/create"
              class="ml-auto text-primary underline underline-offset-4"
            >
              Create post
            </RouterLink>
          </nav>
        </header>
        <main class="mx-auto max-w-5xl px-6 py-6">
          <router-view />
        </main>
      </div>
    </template>
  </Admin>
</template>
