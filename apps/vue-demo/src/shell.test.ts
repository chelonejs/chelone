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
import { afterEach, expect, it, vi } from "vitest";
import { h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "./App.vue";
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

// The resources' icons are the `<Resource icon>` props in `App.vue`, so this
// mounts the app itself rather than the shell over the bare registry.
it("no two sidebar entries render the same icon", async () => {
  const router = makeRouter();
  await router.push("/posts");
  const wrapper = mount(App, { global: { plugins: [router] } });

  // The app signs in and checks access before the menu lists its resources.
  await vi.waitFor(async () => {
    await flushPromises();
    expect(
      wrapper.find('[data-slot="sidebar-content"]').findAll("a").length,
    ).toBeGreaterThan(20);
  });

  const owners = new Map<string, string | undefined>();
  for (const link of wrapper
    .find('[data-slot="sidebar-content"]')
    .findAll("a")) {
    const href = link.attributes("href");
    const icon = link.find("svg").exists() ? link.get("svg").html() : "";
    expect(icon, `${href} has no icon`).not.toBe("");
    expect(owners.get(icon), `${href} repeats another entry's icon`).toBe(
      undefined,
    );
    owners.set(icon, href);
  }
});

/** The app, signed in, with its sidebar menu listed. */
async function mountApp() {
  const router = makeRouter();
  await router.push("/posts");
  const wrapper = mount(App, { global: { plugins: [router] } });
  await vi.waitFor(async () => {
    await flushPromises();
    expect(
      wrapper.find('[data-slot="sidebar-content"]').findAll("a").length,
    ).toBeGreaterThan(20);
  });
  return wrapper;
}

const addPost = "Another user adds a post";
const lockPost = "Another user locks post 1";

it("the Realtime group follows the dashboard item and holds the posts entry, then the simulation buttons", async () => {
  const wrapper = await mountApp();

  const entries = wrapper
    .find('[data-slot="sidebar-content"]')
    .findAll(
      '[data-slot="sidebar-menu-button"], [data-slot="sidebar-group-label"]',
    )
    .map((entry) => entry.text());
  expect(entries.slice(0, 5)).toEqual([
    "Dashboard",
    "Realtime",
    "Posts",
    addPost,
    lockPost,
  ]);
});

it("the simulation buttons keep their text and have no tooltip while the sidebar is open", async () => {
  const wrapper = await mountApp();
  const content = wrapper.find('[data-slot="sidebar-content"]');

  for (const name of [addPost, lockPost]) {
    const button = content
      .findAll("button")
      .find((candidate) => candidate.text() === name);
    expect(button, name).toBeDefined();
    expect(button?.attributes("title")).toBeUndefined();
  }
});

it("a collapsed sidebar turns the simulation buttons into named icon buttons with tooltips", async () => {
  const wrapper = await mountApp();
  await wrapper.get('button[aria-label="Close menu"]').trigger("click");

  const content = wrapper.find('[data-slot="sidebar-content"]');
  for (const name of [addPost, lockPost]) {
    const button = content.get(`button[aria-label="${name}"]`);
    expect(button.text()).toBe("");
    expect(button.attributes("title")).toBe(name);
    expect(button.find("svg").exists()).toBe(true);
  }
});

it("a collapsed sidebar keeps the posts entry's name, and shows it as a tooltip", async () => {
  const wrapper = await mountApp();
  await wrapper.get('button[aria-label="Close menu"]').trigger("click");

  const posts = wrapper
    .find('[data-slot="sidebar-content"]')
    .get('a[href="/vue-demo/posts"]');
  expect(posts.text()).toBe("Posts");
  expect(posts.attributes("title")).toBe("Posts");
});
