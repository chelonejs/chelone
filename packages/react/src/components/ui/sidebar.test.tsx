/**
 * `<SidebarMenuButton>` size classes (#1757). The default and `sm` sizes carry
 * their height as a floor with `py-1.5`, so a one-line row sits at that floor
 * and an entry whose label wraps onto a second line grows its box and keeps its
 * hover/active background over the whole label. `lg` is the app-header size and
 * stays fixed. jsdom applies no CSS, so these assert the classes, never a
 * computed height.
 */

import { elementOf } from "@chelone/test-utils";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cssVars } from "@/lib/css-vars";

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
    expect(def.classList.contains("py-1.5")).toBe(true);

    const sm = menuButton("sm");
    expect(sm.classList.contains("h-7")).toBe(false);
    expect(sm.classList.contains("min-h-7")).toBe(true);
    expect(sm.classList.contains("py-1.5")).toBe(true);
  });

  it("keeps the fixed height of the lg app-header size", () => {
    expect(menuButton("lg").classList.contains("h-12")).toBe(true);
  });
});

/**
 * The icon-collapsed floating sidebar (#1784). jsdom has no layout, so the
 * symmetry of the icons and the app bar clearing the panel are checked in a
 * browser; these pin the structure that layout hangs on.
 */
describe("<Sidebar> collapsed to icons", () => {
  function renderFloatingSidebar() {
    render(
      <SidebarProvider>
        <Sidebar variant="floating" collapsible="icon">
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Posts</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarTrigger />
        <main>Content</main>
      </SidebarProvider>,
    );
    return elementOf(
      document.querySelector('[data-slot="sidebar"]'),
      HTMLDivElement,
    );
  }

  it("collapses to icon mode and keeps each entry reachable by name", () => {
    const sidebar = renderFloatingSidebar();
    expect(sidebar.dataset.state).toBe("expanded");

    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

    expect(sidebar.dataset.state).toBe("collapsed");
    expect(sidebar.dataset.collapsible).toBe("icon");
    expect(sidebar.dataset.variant).toBe("floating");
    expect(screen.getByRole("button", { name: "Posts" })).toBeTruthy();
  });

  it("reserves the sidebar's space ahead of the content it floats beside", () => {
    const sidebar = renderFloatingSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

    const [gap, container] = Array.from(sidebar.children);
    expect(gap?.getAttribute("data-slot")).toBe("sidebar-gap");
    expect(container?.getAttribute("data-slot")).toBe("sidebar-container");
    expect(
      sidebar.compareDocumentPosition(screen.getByRole("main")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hands its sizing variables to the wrapper the gap and the panel share", () => {
    render(
      <SidebarProvider>
        <Sidebar
          variant="floating"
          collapsible="icon"
          style={cssVars({ "--sidebar-width-icon": "64px" })}
        />
      </SidebarProvider>,
    );

    const sidebar = elementOf(
      document.querySelector('[data-slot="sidebar"]'),
      HTMLDivElement,
    );
    expect(sidebar.style.getPropertyValue("--sidebar-width-icon")).toBe("64px");
    expect(
      sidebar.contains(document.querySelector('[data-slot="sidebar-gap"]')),
    ).toBe(true);
    expect(
      sidebar.contains(
        document.querySelector('[data-slot="sidebar-container"]'),
      ),
    ).toBe(true);
  });
});
