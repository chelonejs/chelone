/**
 * `<AppSidebar>` brand link: `brandHref` renders a plain anchor with the href
 * as given, `brandTo` and the default stay router links under the basename, an
 * unsafe `brandHref` never reaches the DOM as an executable href, and the
 * brand label and icon can be given as slots. The Vue twin of the React
 * `app-sidebar.test.tsx`.
 */

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, provide, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { BasenameKey } from "../../../router/adapter";
import { provideVueRouterAdapter } from "../../../router/vue-router-adapter";
import { SidebarProvider } from "../../ui/sidebar";
import AppSidebar, { type AppSidebarProps } from "./app-sidebar.vue";

const Blank = defineComponent({ setup: () => () => h("div", "blank") });

async function mountSidebar(
  props: AppSidebarProps,
  slots: Record<string, () => VNode> = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: Blank }],
  });
  const Host = defineComponent({
    setup() {
      provideVueRouterAdapter();
      provide(BasenameKey, "/demo");
      return () =>
        h(SidebarProvider, null, {
          default: () =>
            h(AppSidebar, props, { default: () => h("nav"), ...slots }),
        });
    },
  });
  const wrapper = mount(Host, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

const brandLink = (wrapper: Awaited<ReturnType<typeof mountSidebar>>) =>
  wrapper.get('[data-slot="sidebar-header"] a');

describe("<AppSidebar> brand link", () => {
  it("links the brand to the dashboard under the basename by default", async () => {
    const wrapper = await mountSidebar({});
    expect(brandLink(wrapper).attributes("href")).toBe("/demo/");
  });

  it("uses brandTo as given when brandHref is unset", async () => {
    const wrapper = await mountSidebar({ brandTo: "/home" });
    expect(brandLink(wrapper).attributes("href")).toBe("/home");
  });

  it("renders brandHref as a plain anchor, with no basename prefix", async () => {
    const wrapper = await mountSidebar({
      brandHref: "/",
      brandTo: "/ignored",
    });
    expect(brandLink(wrapper).attributes("href")).toBe("/");
  });

  it("renders no executable href for a javascript: brandHref", async () => {
    const wrapper = await mountSidebar({ brandHref: "javascript:alert(1)" });
    expect(brandLink(wrapper).attributes("href") ?? "").not.toMatch(
      /javascript/i,
    );
    expect(wrapper.html()).not.toMatch(/javascript:/i);
  });

  it("renders the #brand slot in place of the brand label, keeping #brand-icon", async () => {
    const wrapper = await mountSidebar(
      { brand: "Ignored" },
      {
        brand: () => h("strong", "Slotted brand"),
        "brand-icon": () => h("img", { alt: "mark" }),
      },
    );
    const link = brandLink(wrapper);
    expect(link.text()).toBe("Slotted brand");
    expect(link.find("img[alt='mark']").exists()).toBe(true);
  });
});
