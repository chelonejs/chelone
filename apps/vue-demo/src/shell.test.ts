/**
 * The Vue demo shell's sidebar header, mounted under `<Admin>` the way `App.vue`
 * mounts it, on a router whose history carries the app's real base (`/vue-demo`,
 * mirroring `base` in `vite.config.ts`).
 *
 * jsdom applies no CSS: assert DOM, roles and hrefs, never styling.
 */
import { createNotificationStore } from "@chelone/core";
import { makeDemoAuthProvider, makeDemoStore } from "@chelone/demo-data";
import { Admin } from "@chelone/vue";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, expect, it } from "vitest";
import { h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n } from "./i18n";
import { pageRoutes } from "./pages";
import { dataProvider } from "./realtime";
import { resources } from "./resources/schema";
import Shell from "./Shell.vue";

enableAutoUnmount(afterEach);

function makeRouter() {
  return createRouter({
    history: createMemoryHistory("/vue-demo"),
    // A catch-all keeps vue-router from warning about the paths the menu links
    // to before `<Admin>` has added the resource routes for them.
    routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
  });
}

async function mountShell() {
  const store = makeDemoStore();
  const router = makeRouter();
  await router.push("/posts");
  const wrapper = mount(Admin, {
    props: {
      dataProvider,
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      registry: resources,
      i18n,
      notifications: createNotificationStore(),
      store,
      authProvider: makeDemoAuthProvider(store),
      customRoutes: pageRoutes,
    },
    slots: {
      layout: () => h(Shell),
      dashboard: () => h("div"),
    },
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

function header(wrapper: Awaited<ReturnType<typeof mountShell>>) {
  const header = wrapper.find('[data-slot="sidebar-header"]');
  if (!header.exists()) throw new Error("no sidebar header");
  return header;
}

it("the header brands the demo with the Chelone mark, not the default icon", async () => {
  const wrapper = await mountShell();

  const brand = header(wrapper).get("a");
  const logo = brand.find("img");
  expect(logo.attributes("src")).toMatch(/chelone-mark\.svg$/);
  expect(brand.text()).toContain("Chelone");
  // The default `<AppSidebar>` glyph is an inline `Shell` svg; the mark replaces it.
  expect(header(wrapper).find("svg").exists()).toBe(false);
});

it("the brand links to the site home, unprefixed by the demo's base", async () => {
  const wrapper = await mountShell();

  expect(header(wrapper).get("a").attributes("href")).toBe("/");
});

it("the custom sidebar keeps the demo's own menu", async () => {
  const wrapper = await mountShell();

  // vue-router prefixes every router link with the history base, which is what
  // the brand anchor above must not be.
  const links = wrapper
    .find('[data-slot="sidebar-content"]')
    .findAll("a")
    .map((link) => link.attributes("href"));
  expect(links).toContain("/vue-demo/posts");
});
