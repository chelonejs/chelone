/**
 * `<AppSidebar>` brand link: `brandHref` renders a plain anchor with the href
 * as given, `brandTo` and the default stay router links under the basename,
 * and an unsafe `brandHref` never reaches the DOM as an executable href.
 */

import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CheloneProvider } from "../../../context";
import { ResourceRegistryProvider } from "../../../resource";
import { BasenameProvider } from "../../../router";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { AppSidebar, type AppSidebarProps } from "./app-sidebar";

afterEach(cleanup);

function renderSidebar(props: AppSidebarProps) {
  const wrap = (children: ReactNode) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({ locale: "en", messages: { en: {} } })}
      notifications={createNotificationStore()}
    >
      <ResourceRegistryProvider registry={createResourceRegistry()}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <BasenameProvider basename="/demo">{children}</BasenameProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
  return render(
    wrap(
      <SidebarProvider>
        <AppSidebar {...props}>
          <nav />
        </AppSidebar>
      </SidebarProvider>,
    ),
  );
}

const brandLink = () => screen.getByRole("link", { name: /chelone/i });

describe("<AppSidebar> brand link", () => {
  it("links the brand to the dashboard under the basename by default", () => {
    renderSidebar({});
    expect(brandLink().getAttribute("href")).toBe("/demo/");
  });

  it("uses brandTo as given when brandHref is unset", () => {
    renderSidebar({ brandTo: "/home" });
    expect(brandLink().getAttribute("href")).toBe("/home");
  });

  it("renders brandHref as a plain anchor, with no basename prefix", () => {
    renderSidebar({ brandHref: "/", brandTo: "/ignored" });
    expect(brandLink().getAttribute("href")).toBe("/");
  });

  it("renders no executable href for a javascript: brandHref", () => {
    renderSidebar({ brandHref: "javascript:alert(1)" });
    const link = screen.getByText("Chelone").closest("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href") ?? "").not.toMatch(/javascript/i);
    expect(document.body.innerHTML).not.toMatch(/javascript:/i);
  });
});
