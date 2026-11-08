/**
 * P7e-T3 tests: `<Layout>` — the default admin layout slot.
 *
 * Renders the shell chrome (sidebar → menu, app bar, notification toaster) and
 * the injected route `children`. Asserts: children render inside the content
 * area; the resource menu (from the registry) appears in the sidebar; the app
 * bar's sidebar toggle is present; a content-area crash is caught by the inner
 * error boundary.
 */

import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HasDashboardContext } from "../../../admin";
import { CheloneProvider } from "../../../context";
import { ResourceRegistryProvider } from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { Layout } from "./layout";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.open_menu": "Open menu",
        "chelone.action.close_menu": "Close menu",
        "chelone.action.toggle_theme": "Toggle theme",
      }),
    },
  });
}

function Providers({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={makeI18n()}
      notifications={createNotificationStore()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <HasDashboardContext.Provider value={false}>
              {children}
            </HasDashboardContext.Provider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<Layout>", () => {
  it("renders the injected route children in the content area", () => {
    render(
      <Providers>
        <Layout>
          <div data-testid="page">Page content</div>
        </Layout>
      </Providers>,
    );
    expect(screen.getByTestId("page").textContent).toBe("Page content");
  });

  it("renders the resource menu from the registry in the sidebar", () => {
    render(
      <Providers>
        <Layout>
          <div>content</div>
        </Layout>
      </Providers>,
    );
    // The sidebar `<Menu>` renders a link for the registered "posts" resource.
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
  });

  it("renders the app bar sidebar toggle", () => {
    render(
      <Providers>
        <Layout>
          <div>content</div>
        </Layout>
      </Providers>,
    );
    // The default AppBar renders the sidebar toggle button (from ui/sidebar).
    expect(
      screen.getByRole("button", { name: /toggle sidebar/i }),
    ).toBeTruthy();
  });

  it("renders the skip link before the sidebar menu", () => {
    render(
      <Providers>
        <Layout>
          <div>content</div>
        </Layout>
      </Providers>,
    );
    const skip = screen.getByRole("button", { name: "Skip to content" });
    const menuLink = screen.getByRole("link", { name: /posts/i });
    const toggle = screen.getByRole("button", { name: /toggle sidebar/i });
    for (const later of [menuLink, toggle]) {
      expect(
        skip.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("skip link focus target is the content area, not the app bar", () => {
    render(
      <Providers>
        <Layout>
          <button type="button">First control</button>
        </Layout>
      </Providers>,
    );
    const target = elementOf(
      document.getElementById("main-content"),
      HTMLElement,
    );
    expect(target.contains(screen.getByText("First control"))).toBe(true);
    expect(
      target.contains(screen.getByRole("button", { name: /toggle sidebar/i })),
    ).toBe(false);
    expect(
      target.contains(screen.getByRole("button", { name: "Skip to content" })),
    ).toBe(false);
    const focus = vi.spyOn(target, "focus");
    fireEvent.click(screen.getByRole("button", { name: "Skip to content" }));
    expect(focus).toHaveBeenCalledTimes(1);
    expect(target.hasAttribute("tabindex")).toBe(false);
  });

  it("renders the brand default", () => {
    render(
      <Providers>
        <Layout>
          <div>content</div>
        </Layout>
      </Providers>,
    );
    expect(screen.getByText("Chelone")).toBeTruthy();
  });

  it("catches a content-area crash with the error boundary", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Boom(): never {
      throw new Error("kaboom");
    }
    render(
      <Providers>
        <Layout>
          <Boom />
        </Layout>
      </Providers>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/kaboom/)).toBeTruthy();
    // The chrome (sidebar menu) survives the content crash.
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    spy.mockRestore();
  });
});
