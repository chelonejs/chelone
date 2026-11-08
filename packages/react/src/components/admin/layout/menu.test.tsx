/**
 * P7e-T3 tests: `<Menu>` — the sidebar navigation menu.
 *
 * Reads the P6 resource registry (`useResourceDefinitions`) + the dashboard
 * flag (`useHasDashboard`), and renders one link per list-enabled resource,
 * bucketed by each resource's `options.group`. Asserts: registered resources
 * appear as links, grouping honors `options.group`, resources without a list
 * are skipped, and the dashboard item appears only when `HasDashboardContext`
 * is true.
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HasDashboardContext } from "../../../admin";
import { CheloneProvider } from "../../../context";
import { ResourceRegistryProvider } from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { Menu } from "./menu";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.dashboard": "Dashboard",
      }),
    },
  });
}

interface ResourceSeed {
  name: string;
  hasList?: boolean;
  options?: Record<string, unknown>;
}

function Providers({
  children,
  resources,
  hasDashboard = false,
}: {
  children: ReactNode;
  resources: ResourceSeed[];
  hasDashboard?: boolean;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  for (const r of resources) {
    registry.register({
      name: r.name,
      hasList: r.hasList ?? true,
      hasCreate: false,
      hasEdit: false,
      hasShow: false,
      options: r.options,
    });
  }
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <HasDashboardContext.Provider value={hasDashboard}>
              <SidebarProvider>{children}</SidebarProvider>
            </HasDashboardContext.Provider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<Menu>", () => {
  it("renders one link per list-enabled resource", () => {
    render(
      <Providers resources={[{ name: "posts" }, { name: "comments" }]}>
        <Menu />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /comments/i })).toBeTruthy();
  });

  it("skips resources without a list view", () => {
    render(
      <Providers
        resources={[{ name: "posts" }, { name: "settings", hasList: false }]}
      >
        <Menu />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
  });

  it("buckets resources under their options.group label", () => {
    render(
      <Providers
        resources={[
          { name: "posts", options: { group: "Content" } },
          { name: "comments", options: { group: "Content" } },
          { name: "users" },
        ]}
      >
        <Menu />
      </Providers>,
    );
    // The group label renders as a collapsible trigger.
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /comments/i })).toBeTruthy();
    // Ungrouped resource still renders (in the unlabeled section).
    expect(screen.getByRole("link", { name: /users/i })).toBeTruthy();
  });

  it("omits the dashboard item when the app has no dashboard", () => {
    render(
      <Providers resources={[{ name: "posts" }]} hasDashboard={false}>
        <Menu />
      </Providers>,
    );
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("renders the dashboard item when the app has a dashboard", () => {
    render(
      <Providers resources={[{ name: "posts" }]} hasDashboard>
        <Menu />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();
  });

  it("renders custom children instead of the auto resource list", () => {
    render(
      <Providers resources={[{ name: "posts" }]}>
        <Menu>
          <Menu.Item to="/settings" label="Settings" />
        </Menu>
      </Providers>,
    );
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    // The auto-generated resource link is suppressed when children are given.
    expect(screen.queryByRole("link", { name: /posts/i })).toBeNull();
  });
});
