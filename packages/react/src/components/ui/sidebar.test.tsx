/**
 * `<SidebarMenuButton>` size classes (#1757). The default and `sm` sizes carry
 * their height as a floor, not a fixed height, so an entry whose label wraps
 * onto a second line grows its box and keeps its hover/active background over
 * the whole label. `lg` is the app-header size and stays fixed. jsdom applies no
 * CSS, so these assert the classes, never a computed height.
 */

import { elementOf } from "@chelone/test-utils";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";

afterEach(cleanup);

function menuButton(size: "default" | "sm" | "lg") {
  render(
    <SidebarProvider>
      <SidebarMenuButton size={size}>Delivery calendar</SidebarMenuButton>
    </SidebarProvider>,
  );
  return elementOf(
    document.querySelector(`[data-size="${size}"]`),
    HTMLButtonElement,
  );
}

describe("<SidebarMenuButton> sizes", () => {
  it("grows with a wrapped label at the default and sm sizes", () => {
    const def = menuButton("default");
    expect(def.classList.contains("h-8")).toBe(false);
    expect(def.classList.contains("min-h-8")).toBe(true);

    const sm = menuButton("sm");
    expect(sm.classList.contains("h-7")).toBe(false);
    expect(sm.classList.contains("min-h-7")).toBe(true);
  });

  it("keeps the fixed height of the lg app-header size", () => {
    expect(menuButton("lg").classList.contains("h-12")).toBe(true);
  });
});
