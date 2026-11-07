/**
 * `<SectionSwitcher>` — the dropdown at the head of the docs sidebar that moves
 * between the site's sections. Mounted inside a `<SidebarProvider>` (it reads
 * `useSidebar`) and a router with a basename: the demo is a separate SPA under
 * `/demo/`, so its entry must carry that URL as given, where Home and Docs stay
 * router links the basename does prefix.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SectionSwitcher } from "./section-switcher";

afterEach(cleanup);

// Radix DropdownMenu opens on `pointerdown`; jsdom has no `PointerEvent`.
if (typeof globalThis.PointerEvent === "undefined") {
  vi.stubGlobal("PointerEvent", MouseEvent);
}

// `at` is the path inside the app; a router with a basename matches its entries
// against the full URL, so the basename is part of what is pushed.
function renderSwitcher(at: string, basename = "/site") {
  return render(
    <MemoryRouter basename={basename} initialEntries={[`${basename}${at}`]}>
      <SidebarProvider>
        <SectionSwitcher />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

function openSwitcher() {
  const trigger = screen.getByRole("button", { name: /Chelone/ });
  fireEvent.pointerDown(
    trigger,
    new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
  );
  fireEvent.pointerUp(
    trigger,
    new MouseEvent("pointerup", { bubbles: true, button: 0 }),
  );
  fireEvent.click(trigger);
}

test("the dropdown lists Home, Docs and Demo", async () => {
  renderSwitcher("/docs/ui-layout/app-sidebar");
  openSwitcher();

  const items = await screen.findAllByRole("menuitem");
  expect(items.map((item) => item.textContent)).toEqual([
    "Home",
    "Docs",
    "Demo",
  ]);
});

test("the Demo entry goes to /demo/, unprefixed by the router basename", async () => {
  renderSwitcher("/docs/ui-layout/app-sidebar");
  openSwitcher();

  const demo = await screen.findByRole("menuitem", { name: "Demo" });
  expect(demo.getAttribute("href")).toBe("/demo/");
});

test("Home and Docs stay router links, which the basename does prefix", async () => {
  renderSwitcher("/docs/ui-layout/app-sidebar");
  openSwitcher();

  expect(
    (await screen.findByRole("menuitem", { name: "Docs" })).getAttribute(
      "href",
    ),
  ).toBe("/site/docs");
  expect(
    (await screen.findByRole("menuitem", { name: "Home" })).getAttribute(
      "href",
    ),
  ).toBe("/site");
});

test("the trigger names the section the page sits in", () => {
  renderSwitcher("/docs/ui-layout/app-sidebar");

  expect(screen.getByRole("button", { name: /Chelone/ }).textContent).toContain(
    "Docs",
  );
});
