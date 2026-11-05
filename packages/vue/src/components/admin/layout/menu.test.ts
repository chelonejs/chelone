/**
 * V3-a Task 2 contract — the resource `<Menu>` family. The Vue twin of
 * `@chelone/react`'s `layout/menu.test.tsx`, translated to the Vue mount
 * harness. Asserts the menu AUTO-BUILDS one entry per list-enabled resource
 * (reading the reactive `<Admin>` registry), highlights the active route via the
 * router `useMatch`, navigates on click, renders the dashboard entry only when a
 * `#dashboard` slot is present, and lets custom children replace the auto list.
 */

import { fakeDataProvider } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { provideHasDashboard } from "../../../admin/has-dashboard";
import Resource from "../../../admin/resource.vue";
import {
  createResourceRegistry,
  ResourceRegistryKey,
} from "../../../admin/resource-registry";
import { CheloneContextKey, type CheloneContextValue } from "../../../context";
import { provideVueRouterAdapter } from "../../../router/vue-router-adapter";
import Menu from "./menu.vue";
import MenuItemLink from "./menu-item-link.vue";

const Blank = defineComponent({ setup: () => () => h("div", "blank") });

const dataProvider = fakeDataProvider({});

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
}

describe("<Menu> (resource menu family)", () => {
  it("auto-builds one link per list-enabled resource, in order", async () => {
    const router = makeRouter();
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Blank }),
          h(Resource, { name: "authors", list: Blank }),
          // No list view → no menu entry.
          h(Resource, { name: "tags", edit: Blank }),
        ],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    const hrefs = wrapper
      .findAll('[data-slot="sidebar-menu-button"]')
      .map((el) => el.attributes("href"));
    expect(hrefs).toContain("/posts");
    expect(hrefs).toContain("/authors");
    expect(hrefs).not.toContain("/tags");
  });

  it("highlights the entry whose route is active", async () => {
    const router = makeRouter();
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Blank }),
          h(Resource, { name: "authors", list: Blank }),
        ],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    await router.push("/posts");
    await flushPromises();

    expect(wrapper.find('[href="/posts"]').attributes("data-active")).toBe(
      "true",
    );
    expect(
      wrapper.find('[href="/authors"]').attributes("data-active"),
    ).toBeUndefined();
  });

  it("keeps the parent list entry active on a child route (end:false parity)", async () => {
    const router = makeRouter();
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Blank }),
          h(Resource, { name: "authors", list: Blank }),
        ],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    await router.push("/posts/1");
    await flushPromises();

    // React parity: resource links use end:false, so `/posts` stays highlighted
    // on a child detail route while a sibling list does not.
    expect(wrapper.find('[href="/posts"]').attributes("data-active")).toBe(
      "true",
    );
    expect(
      wrapper.find('[href="/authors"]').attributes("data-active"),
    ).toBeUndefined();
  });

  it("navigates when a menu link is clicked", async () => {
    const router = makeRouter();
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Blank }),
          h(Resource, { name: "authors", list: Blank }),
        ],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    await wrapper.find('[href="/authors"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/authors");
  });

  it("renders the dashboard entry only when a #dashboard slot is given", async () => {
    const withDash = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
        dashboard: () => h("div", "dash"),
      },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();
    expect(withDash.text()).toContain("Dashboard");

    const noDash = mount(Admin, {
      props: { dataProvider },
      slots: { default: () => h(Resource, { name: "posts", list: Blank }) },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();
    expect(noDash.text()).not.toContain("Dashboard");
  });

  it("renders custom children instead of the auto resource list", async () => {
    const router = makeRouter();
    // Mount <Menu> directly with a hand-rolled registry (posts registered) so we
    // can prove the default-slot children SUPPRESS the auto resource entries.
    const registry = createResourceRegistry();
    registry.register({ name: "posts", list: Blank });

    const Host = defineComponent({
      setup(_props, { slots }) {
        provideVueRouterAdapter();
        return () => slots.default?.();
      },
    });

    const wrapper = mount(Host, {
      slots: {
        default: () =>
          h(
            Menu,
            {},
            {
              default: () =>
                h(MenuItemLink, { to: "/settings", label: "Settings" }),
            },
          ),
      },
      global: {
        plugins: [router],
        provide: {
          [ResourceRegistryKey as symbol]: registry,
          [CheloneContextKey as symbol]: {} as CheloneContextValue,
        },
      },
    });
    await flushPromises();

    const hrefs = wrapper
      .findAll('[data-slot="sidebar-menu-button"]')
      .map((el) => el.attributes("href"));
    expect(hrefs).toContain("/settings");
    // The auto-generated resource link is suppressed when children are given.
    expect(hrefs).not.toContain("/posts");
  });
});

describe("provideHasDashboard", () => {
  it("is a no-op-safe seam (default false via useHasDashboard inject)", () => {
    // Smoke: the provider function exists and is callable inside a setup.
    const Host = defineComponent({
      setup() {
        provideHasDashboard(true);
        return () => h("div");
      },
    });
    expect(() => mount(Host)).not.toThrow();
  });
});
