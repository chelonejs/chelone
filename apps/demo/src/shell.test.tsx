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
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test } from "vitest";
import { App } from "./App";
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

// The resources' icons are the `<Resource icon>` props in `App.tsx`, so this
// mounts the app itself rather than the shell over the bare registry.
test("no two sidebar entries render the same icon", async () => {
  window.history.pushState({}, "", "/demo/posts");
  render(<App />);

  // The app signs in and checks access before the menu lists its resources.
  const content = await waitFor(() => {
    const found = elementOf(
      document.querySelector('[data-slot="sidebar-content"]'),
      HTMLElement,
    );
    expect(within(found).getAllByRole("link").length).toBeGreaterThan(20);
    return found;
  });

  const owners = new Map<string | undefined, string | null>();
  for (const link of within(content).getAllByRole("link")) {
    const href = link.getAttribute("href");
    const icon = link.querySelector("svg")?.innerHTML;
    expect(icon, `${href} has no icon`).toBeTruthy();
    expect(owners.get(icon), `${href} repeats another entry's icon`).toBe(
      undefined,
    );
    owners.set(icon, href);
  }
});

/** The app, signed in, with its sidebar menu listed. */
async function renderApp() {
  window.history.pushState({}, "", "/demo/posts");
  render(<App />);
  return waitFor(() => {
    const found = elementOf(
      document.querySelector('[data-slot="sidebar-content"]'),
      HTMLElement,
    );
    expect(within(found).getAllByRole("link").length).toBeGreaterThan(20);
    return found;
  });
}

const addPost = "Another user adds a post";
const lockPost = "Another user locks post 1";

test("the Realtime group follows the dashboard item and holds the posts entry, then the simulation buttons", async () => {
  const content = await renderApp();

  const entries = [
    ...content.querySelectorAll(
      '[data-slot="sidebar-menu-button"], [data-slot="sidebar-group-label"]',
    ),
  ].map((entry) => entry.textContent);
  expect(entries.slice(0, 5)).toEqual([
    "Dashboard",
    "Realtime",
    "Posts",
    addPost,
    lockPost,
  ]);
});

test("the simulation buttons keep their text while the sidebar is open", async () => {
  const content = await renderApp();

  for (const name of [addPost, lockPost]) {
    const button = within(content).getByRole("button", { name });
    expect(button.textContent).toBe(name);
  }
});

test("a collapsed sidebar turns the simulation buttons into named icon buttons with tooltips", async () => {
  const content = await renderApp();

  fireEvent.keyDown(window, { key: "b", ctrlKey: true });

  for (const name of [addPost, lockPost]) {
    const button = within(content).getByRole("button", { name });
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")).toBeTruthy();
  }
  fireEvent.focus(within(content).getByRole("button", { name: addPost }));
  expect((await screen.findByRole("tooltip")).textContent).toBe(addPost);
});

test("a collapsed sidebar keeps the posts entry's name, and shows it as a tooltip", async () => {
  const content = await renderApp();

  fireEvent.keyDown(window, { key: "b", ctrlKey: true });

  const posts = within(content).getByRole("link", { name: "Posts" });
  expect(posts.getAttribute("href")).toBe("/demo/posts");
  fireEvent.focus(posts);
  expect((await screen.findByRole("tooltip")).textContent).toBe("Posts");
});
