/**
 * The Vue demo entry — the app-root wiring the React demo's `main.tsx` does for
 * React. Creates the Vue app, installs a vue-router (the neutral history the
 * `@chelone/vue` router adapter binds to) and the `@tanstack/vue-query` plugin
 * (sharing ONE `QueryClient` with `<Admin>`), then mounts.
 *
 * `<Admin>` builds the resource routes REACTIVELY (`/posts`, `/posts/create`,
 * `/posts/:id`, `/authors`, …) as each `<Resource>` registers — so the router
 * here starts with none, and `<Admin>` redirects the index to the first
 * resource itself. The dynamically-added routes may not exist yet when the
 * initial navigation resolves, so we re-resolve the current location once the
 * app is mounted (and `<Admin>` has registered the routes) to land on the real
 * page.
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

// <Admin> registered its resource routes during mount. If the initial URL had
// no match yet (it resolved before those routes existed), re-run navigation to
// the current location so the freshly-added route now resolves. The index is
// left alone: <Admin> redirects it, and re-resolving "/" here would cancel that
// redirect's pending navigation.
router.isReady().then(() => {
  const current = router.currentRoute.value;
  if (current.matched.length === 0 && current.path !== "/") {
    void router.replace(current.fullPath);
  }
});
