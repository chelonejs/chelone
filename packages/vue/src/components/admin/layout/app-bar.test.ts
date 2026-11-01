/**
 * V3-a Task 3 integration — the app-bar wires `<Title>` + `<UserMenu>`. Mounts a
 * real `<Admin>` (default `<Layout>` → `<AppBar>`) with an authProvider and a
 * resource whose list view sets a page `<Title>`. Asserts end-to-end: the view's
 * title teleports into the app-bar title portal, and the app-bar renders the
 * user menu whose logout item drives the authProvider's `logout`. This proves
 * T1's `<AppBar>` now renders both the `<UserMenu>` and the `<Title>` target.
 */

import { type AuthProvider, createI18n } from "@chelone/core";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import type { CheloneContextValue } from "../../../context";
import AppBar from "./app-bar.vue";
import Title from "./title.vue";
import { TITLE_PORTAL_ID } from "./title-portal-id";

const dataProvider = {
  name: "stub-dp",
} as unknown as CheloneContextValue["dataProvider"];

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    getIdentity: async () => ({ id: 1, fullName: "Rin", avatar: undefined }),
    ...over,
  };
}

/** A list view that declares its own page title via `<Title>`. */
const PostList = defineComponent({
  setup: () => () => h(Title, { title: "Posts" }),
});

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => h("div") } }],
  });
}

/** Poll `predicate`, flushing pending promises/microtasks between attempts. */
async function until(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 50; i += 1) {
    if (predicate()) return;
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("until: condition never became true");
}

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("<AppBar> integration (title + user menu)", () => {
  it("shows a view's title and a working user menu in the app bar", async () => {
    const logout = vi.fn(async () => {});
    const router = makeRouter();
    wrapper = mount(Admin, {
      props: { dataProvider, authProvider: makeAuthProvider({ logout }) },
      slots: {
        default: () => [h(Resource, { name: "posts", list: PostList })],
      },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await router.isReady();
    // Wait for <Admin> to register the resource routes (its watchEffect
    // reconciles the router table as the <Resource> children mount) before
    // navigating, so the push matches deterministically. (The sidebar's
    // <MenuItemLink> resolving "/posts" for its active-state before the route
    // exists emits a benign "No match" warn — the same artifact menu.test.ts
    // produces; it is unrelated to this navigation.)
    await until(() => router.hasRoute("chelone-posts-list"));
    await router.push("/posts");
    await flushPromises();

    // The view's <Title> teleported into the app-bar title portal.
    await until(() =>
      (document.getElementById(TITLE_PORTAL_ID)?.textContent ?? "").includes(
        "Posts",
      ),
    );
    expect(document.getElementById(TITLE_PORTAL_ID)?.textContent).toContain(
      "Posts",
    );

    // The app bar renders the user menu (authProvider present) — open it and
    // drive the logout item.
    await until(
      () => wrapper?.find('button[aria-label="Rin"]').exists() ?? false,
    );
    await wrapper.get('[data-slot="dropdown-menu-trigger"]').trigger("click");
    await until(
      () => wrapper?.find('[data-slot="dropdown-menu-item"]').exists() ?? false,
    );
    await wrapper.get('[data-slot="dropdown-menu-item"]').trigger("click");
    await flushPromises();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

describe("<AppBar>", () => {
  const i18nWith = (...locales: string[]) =>
    createI18n({
      locale: locales[0] ?? "en",
      messages: Object.fromEntries(locales.map((code) => [code, {}])),
    });

  const changeLocale = () =>
    wrapper?.find('button[aria-label="Change locale"]').exists() ?? false;

  it("shows the locales menu when the i18n has two locales", async () => {
    wrapper = mount(Admin, {
      props: { dataProvider, i18n: i18nWith("en", "fr") },
      slots: {
        default: () => [h(Resource, { name: "posts", list: PostList })],
      },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();

    expect(changeLocale()).toBe(true);
    expect(wrapper.find('button[aria-label="Toggle theme"]').exists()).toBe(
      true,
    );
  });

  it("shows no locales menu with one locale", async () => {
    wrapper = mount(Admin, {
      props: { dataProvider, i18n: i18nWith("en") },
      slots: {
        default: () => [h(Resource, { name: "posts", list: PostList })],
      },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();

    expect(changeLocale()).toBe(false);
    expect(wrapper.find('button[aria-label="Toggle theme"]').exists()).toBe(
      true,
    );
  });

  it("toolbar slot replaces the locales menu and the theme toggle", async () => {
    wrapper = mount(Admin, {
      props: { dataProvider, i18n: i18nWith("en", "fr") },
      slots: {
        layout: () =>
          h(AppBar, null, {
            start: () => h("span"),
            toolbar: () => h("button", { type: "button" }, "Custom Tool"),
          }),
      },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("Custom Tool");
    expect(changeLocale()).toBe(false);
    expect(wrapper.find('button[aria-label="Toggle theme"]').exists()).toBe(
      false,
    );
  });
});
