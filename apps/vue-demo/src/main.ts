/**
 * The Vue demo entry — the app-root wiring the React demo's `main.tsx` does for
 * React. Creates the Vue app, installs a vue-router (the neutral history the
 * `@chelone/vue` router adapter binds to) and the `@tanstack/vue-query` plugin
 * (sharing ONE `QueryClient` with `<Admin>`), then mounts.
 *
 * `<Admin>` builds the resource routes REACTIVELY (`/posts`, `/posts/create`,
 * `/posts/:id`, `/authors`, …) as each `<Resource>` registers — so the router
 * here starts with none, and `<Admin>` redirects the index to the first
 * resource itself, and re-resolves a deep link that matched nothing before the
 * routes existed.
 */

import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import "./index.css";

const router = createRouter({
  history: createWebHistory(),
  routes: [],
});

const app = createApp(App);
app.use(router);
app.use(VueQueryPlugin);
app.mount("#app");
