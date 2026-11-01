/**
 * V3-a Task 1 contract — the app shell. Mounting `<Admin>` (with no `#layout`
 * slot) must render the default `<Layout>` frame: a sidebar + an app bar, an
 * auto-generated resource menu, and a theme toggle that flips the `dark` class
 * on `<html>`. Mirrors the intent of the React twins' `layout.test.tsx` /
 * `theme-provider.test.tsx`, translated to the Vue mount harness.
 */

import { createNotificationStore } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { CheloneContextKey, type CheloneContextValue } from "../../../context";
import ThemeModeToggle from "./theme-mode-toggle.vue";
import ThemeProvider from "./theme-provider.vue";

// This jsdom config ships without localStorage; install an in-memory stub so the
// theme provider's persistence path (and these assertions) exercise real storage.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}

const Blank = defineComponent({ setup: () => () => h("div", "blank") });

const dataProvider = {
  name: "stub-dp",
} as unknown as CheloneContextValue["dataProvider"];

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
}

beforeEach(() => {
  // jsdom's <html> + localStorage persist across tests — reset the theme state.
  document.documentElement.classList.remove("light", "dark");
  localStorage.clear();
});

describe("<Layout> shell (via <Admin> default slot)", () => {
  it("renders the sidebar + app bar frame around the routed content", async () => {
    const router = makeRouter();
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.find('[data-slot="sidebar"]').exists()).toBe(true);
    expect(wrapper.find('[data-slot="app-bar"]').exists()).toBe(true);
    expect(wrapper.find('[data-slot="sidebar-trigger"]').exists()).toBe(true);
    // The brand header renders the default "Chelone" label.
    expect(wrapper.text()).toContain("Chelone");
  });

  it("auto-generates a menu link per resource that has a list view", async () => {
    const router = makeRouter();
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Blank }),
          h(Resource, { name: "comments", list: Blank }),
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
    expect(hrefs).toContain("/comments");
    expect(hrefs).not.toContain("/tags");
  });

  it("mounts a theme toggle that flips the dark class on <html>", async () => {
    const router = makeRouter();
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    // Default mode "system" resolves to light under jsdom (no matchMedia).
    expect(document.documentElement.classList.contains("light")).toBe(true);

    const toggle = wrapper.find("[data-theme-mode-toggle]");
    expect(toggle.exists()).toBe(true);

    // Cycle order is light -> dark -> system; from the default "system" two
    // clicks (system -> light -> dark) land the dark class on <html>.
    await toggle.trigger("click");
    await toggle.trigger("click");
    await nextTick();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });
});

describe("<Layout> skip link (via <Admin> default slot)", () => {
  async function mountDefaultLayout() {
    const router = makeRouter();
    await router.push("/");
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
      },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await flushPromises();
    return wrapper;
  }

  it("renders the skip link before the sidebar menu and the app bar", async () => {
    const wrapper = await mountDefaultLayout();

    const skip = wrapper.get('[data-slot="skip-navigation-button"]').element;
    const later = [
      wrapper.get('[data-slot="sidebar-menu-button"]').element,
      wrapper.get('[data-slot="sidebar-trigger"]').element,
      wrapper.get('[data-slot="app-bar"]').element,
    ];
    for (const element of later) {
      expect(
        skip.compareDocumentPosition(element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    wrapper.unmount();
  });

  it("skip link focus target is the content area, not the app bar", async () => {
    const wrapper = await mountDefaultLayout();
    const target = document.getElementById("main-content") as HTMLElement;

    expect(target.contains(wrapper.get('[data-slot="app-bar"]').element)).toBe(
      false,
    );
    expect(
      target.contains(
        wrapper.get('[data-slot="skip-navigation-button"]').element,
      ),
    ).toBe(false);
    expect(target.textContent).toContain("blank");

    const focus = vi.spyOn(target, "focus");
    await wrapper.get('[data-slot="skip-navigation-button"]').trigger("click");

    expect(focus).toHaveBeenCalledTimes(1);
    expect(target.hasAttribute("tabindex")).toBe(false);
    wrapper.unmount();
  });
});

describe("<Layout> notifications (via <Admin> default slot)", () => {
  function mountDefaultLayout() {
    const notifications = createNotificationStore();
    const wrapper = mount(Admin, {
      props: { dataProvider, notifications },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
      },
      global: { plugins: [makeRouter()] },
    });
    return { wrapper, notifications };
  }

  it("a notification pushed to the store shows as a toast in the default layout", async () => {
    const { wrapper, notifications } = mountDefaultLayout();
    await flushPromises();

    notifications.notify("Post saved", { type: "success" });
    await flushPromises();

    const toast = wrapper.find('[data-slot="notification-toast"]');
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toContain("Post saved");
  });

  it("an undoable notification in the default layout commits when its toast closes", async () => {
    const { wrapper, notifications } = mountDefaultLayout();
    await flushPromises();
    const onClose = vi.fn();

    notifications.notify("Post deleted", {
      undoable: true,
      autoHideDuration: 5000,
      undo: vi.fn(),
      onClose,
    });
    await flushPromises();
    await wrapper.find('[data-slot="notification-close"]').trigger("click");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("mounts no toast region when <Admin> is given a #layout slot", async () => {
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: { layout: () => h("div", "custom shell") },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("custom shell");
    expect(wrapper.find('[data-slot="notification"]').exists()).toBe(false);
  });
});

describe("<ThemeProvider> + <ThemeModeToggle> in isolation", () => {
  it("cycles light -> dark -> system and persists to localStorage", async () => {
    // The toggle's label uses `useTranslate`, which reads the Chelone context;
    // provide a minimal (i18n-less) one so it echoes without an <Admin>.
    const wrapper = mount(ThemeProvider, {
      props: { defaultTheme: "light", storageKey: "test-theme" },
      slots: { default: () => h(ThemeModeToggle) },
      global: {
        provide: { [CheloneContextKey]: {} as CheloneContextValue },
      },
    });
    await nextTick();
    expect(document.documentElement.classList.contains("light")).toBe(true);

    const toggle = wrapper.find("[data-theme-mode-toggle]");
    await toggle.trigger("click");
    await nextTick();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("test-theme")).toBe("dark");

    await toggle.trigger("click");
    await nextTick();
    expect(localStorage.getItem("test-theme")).toBe("system");
  });
});

describe("<Layout> sidebar by viewport width", () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  // jsdom has no real viewport and no matchMedia: stub both, as the viewport the
  // test wants.
  function setViewport(width: number): void {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: width,
    });
    window.matchMedia = ((query: string) => ({
      matches: width < 768,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  }

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  async function mountLayout() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: Blank },
        { path: "/posts", component: Blank },
        { path: "/comments", component: Blank },
      ],
    });
    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Blank }),
          h(Resource, { name: "comments", list: Blank }),
        ],
      },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await flushPromises();
    return { wrapper, router };
  }

  it("the sidebar trigger opens the sidebar as a drawer with the resource menu", async () => {
    setViewport(500);
    const { wrapper } = await mountLayout();

    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(false);

    await wrapper.find('[data-slot="sidebar-trigger"]').trigger("click");

    const drawer = wrapper.find('[data-slot="sidebar-drawer"]');
    expect(drawer.exists()).toBe(true);
    expect(drawer.attributes("role")).toBe("dialog");
    expect(drawer.attributes("aria-modal")).toBe("true");
    expect(drawer.attributes("aria-label")).toBe("Sidebar");
    const hrefs = drawer
      .findAll('[data-slot="sidebar-menu-button"]')
      .map((el) => el.attributes("href"));
    expect(hrefs).toContain("/posts");
    expect(hrefs).toContain("/comments");
    wrapper.unmount();
  });

  it("clicking a menu link navigates and closes the drawer", async () => {
    setViewport(500);
    const { wrapper, router } = await mountLayout();

    await wrapper.find('[data-slot="sidebar-trigger"]').trigger("click");
    const link = wrapper
      .find('[data-slot="sidebar-drawer"]')
      .find('[href="/posts"]');
    await link.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/posts");
    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("Escape and a backdrop click close the drawer", async () => {
    setViewport(500);
    const { wrapper } = await mountLayout();
    const trigger = wrapper.find('[data-slot="sidebar-trigger"]');

    await trigger.trigger("click");
    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();
    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(false);

    await trigger.trigger("click");
    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(true);
    await wrapper.find('[data-slot="sidebar-backdrop"]').trigger("click");
    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("on a wide viewport the trigger collapses the sidebar and no drawer renders", async () => {
    setViewport(1280);
    const { wrapper } = await mountLayout();

    const sidebar = wrapper.find('[data-slot="sidebar"]');
    expect(sidebar.attributes("data-state")).toBe("expanded");

    await wrapper.find('[data-slot="sidebar-trigger"]').trigger("click");

    expect(wrapper.find('[data-slot="sidebar"]').attributes("data-state")).toBe(
      "collapsed",
    );
    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("without matchMedia the sidebar renders as the desktop column", async () => {
    // @ts-expect-error jsdom ships without matchMedia; keep it that way.
    window.matchMedia = undefined;
    const { wrapper } = await mountLayout();

    await wrapper.find('[data-slot="sidebar-trigger"]').trigger("click");

    expect(wrapper.find('[data-slot="sidebar"]').exists()).toBe(true);
    expect(wrapper.find('[data-slot="sidebar-drawer"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
