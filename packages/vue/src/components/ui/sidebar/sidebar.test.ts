/**
 * The icon-collapsed floating sidebar (#1784), the Vue twin of the React
 * primitive's. jsdom has no layout, so the symmetry of the icons and the content
 * clearing the panel are checked in a browser; these pin the structure that
 * layout hangs on: the collapsed state, the entry still reachable by name, and
 * the panel sitting ahead of the content in the flow.
 */

import { elementOf } from "@chelone/test-utils";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./index";

const Shell = defineComponent({
  setup: () => () =>
    h(SidebarProvider, null, () => [
      h(Sidebar, { variant: "floating", collapsible: "icon" }, () =>
        h(SidebarContent, null, () =>
          h(SidebarMenu, null, () =>
            h(SidebarMenuItem, null, () =>
              h(SidebarMenuButton, null, () => "Posts"),
            ),
          ),
        ),
      ),
      h(SidebarTrigger),
      h("main", "Content"),
    ]),
});

describe("<Sidebar> collapsed to icons", () => {
  it("collapses to icon mode and keeps each entry reachable by name", async () => {
    const wrapper = mount(Shell, { attachTo: document.body });
    const sidebar = elementOf(
      document.querySelector('[data-slot="sidebar"]'),
      HTMLDivElement,
    );
    expect(sidebar.dataset.state).toBe("expanded");

    await wrapper.get('[aria-label="Toggle Sidebar"]').trigger("click");

    expect(sidebar.dataset.state).toBe("collapsed");
    expect(sidebar.dataset.collapsible).toBe("icon");
    expect(sidebar.dataset.variant).toBe("floating");
    expect(wrapper.get('[data-slot="sidebar-menu-button"]').text()).toBe(
      "Posts",
    );
    wrapper.unmount();
  });

  it("keeps the panel in the flow ahead of the content, not over it", async () => {
    const wrapper = mount(Shell, { attachTo: document.body });
    await wrapper.get('[aria-label="Toggle Sidebar"]').trigger("click");

    const sidebar = elementOf(
      document.querySelector('[data-slot="sidebar"]'),
      HTMLDivElement,
    );
    const main = elementOf(document.querySelector("main"), HTMLElement);
    expect(sidebar.nextElementSibling?.nextElementSibling).toBe(main);
    wrapper.unmount();
  });
});
