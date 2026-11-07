/**
 * `<SidebarMenuButton>` size classes (#1757), the Vue twin of the React
 * primitive's sizes: the default and `sm` heights are floors with `py-1.5`, so
 * a one-line row sits at that floor and a wrapped label grows the box under its
 * own highlight. `lg` is the app-header size and stays fixed. jsdom applies no
 * CSS, so these assert the classes, never a computed height.
 */

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SidebarMenuButton from "./sidebar-menu-button.vue";

function classesAt(size: "default" | "sm" | "lg"): string[] {
  const wrapper = mount(SidebarMenuButton, {
    props: { size },
    slots: { default: () => "Delivery calendar" },
  });
  const classes = wrapper.classes();
  wrapper.unmount();
  return classes;
}

describe("<SidebarMenuButton> sizes", () => {
  it("grows with a wrapped label at the default and sm sizes", () => {
    const def = classesAt("default");
    expect(def).toContain("min-h-8");
    expect(def).toContain("py-1.5");
    expect(def).not.toContain("h-8");

    const sm = classesAt("sm");
    expect(sm).toContain("min-h-7");
    expect(sm).toContain("py-1.5");
    expect(sm).not.toContain("h-7");
  });

  it("keeps the fixed height of the lg app-header size", () => {
    expect(classesAt("lg")).toContain("h-12");
  });
});
