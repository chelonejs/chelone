/**
 * The Vue demo entry — the app-root wiring the React demo's `main.tsx` does for
 * React. Creates the Vue app, installs a vue-router (the neutral history the
 * `@chelone/vue` router adapter binds to), then mounts. `<Admin>` provides its
 * own `QueryClient`, so no vue-query plugin is installed.
 *
 * `<Admin>` builds the resource routes REACTIVELY (`/posts`, `/posts/create`,
 * `/posts/:id`, `/authors`, …) as each `<Resource>` registers — so the router
 * here starts with none, and `<Admin>` redirects the index to the first
 * resource itself, and re-resolves a deep link that matched nothing before the
 * routes existed.
 */

import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import DocsPreview from "./DocsPreview.vue";
import "./index.css";

// `/docs-preview/...` is a docs page's iframe of one demo, with no admin routes.
// `<Admin>` still needs a router, so a catch-all keeps vue-router from warning
// that the location matches nothing.
const isDocsPreview = window.location.pathname.startsWith(
  `${import.meta.env.BASE_URL}docs-preview/`,
);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: isDocsPreview
    ? [{ path: "/:pathMatch(.*)*", component: { render: () => null } }]
    : [],
});

const app = createApp(isDocsPreview ? DocsPreview : App);
app.use(router);
app.mount("#app");
