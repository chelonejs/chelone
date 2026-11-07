/**
 * The demo shell's sidebar header, mounted under `<Admin>` the way `App.tsx`
 * mounts it and in a router carrying the app's real basename (`/demo`, mirroring
 * `BrowserRouter basename` in `App.tsx` and `base` in `vite.config.ts`).
 *
 * jsdom applies no CSS: assert DOM, roles and hrefs, never styling.
 */
import { createNotificationStore } from "@chelone/core";
import { makeDemoAuthProvider, makeDemoStore } from "@chelone/demo-data";
import { Admin } from "@chelone/react";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test } from "vitest";
import { i18n } from "./i18n";
import { dataProvider } from "./realtime";
import { resources } from "./resources";
import { Shell } from "./shell";

afterEach(cleanup);

function renderShell() {
  const store = makeDemoStore();
  return render(
    <MemoryRouter basename="/demo" initialEntries={["/demo/posts"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={i18n}
        notifications={createNotificationStore()}
        store={store}
        authProvider={makeDemoAuthProvider(store)}
        resources={resources}
      >
        <Admin.Layout>
          <Shell />
        </Admin.Layout>
      </Admin>
    </MemoryRouter>,
  );
}

function sidebarHeader(): HTMLElement {
  return elementOf(
    document.querySelector('[data-slot="sidebar-header"]'),
    HTMLElement,
  );
}

test("the header brands the demo with the Chelone mark, not the default icon", () => {
  renderShell();

  const brand = within(sidebarHeader()).getByRole("link", { name: "Chelone" });
  const logo = elementOf(brand.querySelector("img"), HTMLImageElement);
  expect(logo.getAttribute("src")).toMatch(/chelone-mark\.svg$/);
  // The default `<AppSidebar>` glyph is a `Shell` svg; the mark replaces it.
  expect(sidebarHeader().querySelector("svg")).toBeNull();
});

test("the brand links to the site home, unprefixed by the demo's basename", () => {
  renderShell();

  const brand = within(sidebarHeader()).getByRole("link", { name: "Chelone" });
  expect(brand.getAttribute("href")).toBe("/");
});

test("the custom sidebar keeps the demo's own menu", () => {
  renderShell();

  const content = elementOf(
    document.querySelector('[data-slot="sidebar-content"]'),
    HTMLElement,
  );
  const links = within(content)
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"));
  expect(links).toContain("/demo/posts");
});
