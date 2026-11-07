/**
 * `<ResourceMenuItemGroup>` takes children: extra entries that sit inside the
 * group, so collapsing a labeled group hides them with the resources.
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CheloneProvider } from "../../../context";
import { ResourceRegistryProvider } from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { ResourceMenuItemGroup } from "./resource-menu-item-group";

afterEach(cleanup);

function Providers({ children }: { children: ReactNode }) {
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
      queryClient={new QueryClient()}
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages({}) },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <SidebarProvider>{children}</SidebarProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<ResourceMenuItemGroup> children", () => {
  it("renders children after the resource entries", () => {
    render(
      <Providers>
        <ResourceMenuItemGroup label="Content" resources={["posts"]}>
          <li>Landing page</li>
        </ResourceMenuItemGroup>
      </Providers>,
    );
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    expect(screen.getByText("Landing page")).toBeTruthy();
  });

  it("hides the children when the labeled group collapses", () => {
    render(
      <Providers>
        <ResourceMenuItemGroup label="Content" resources={["posts"]}>
          <li>Landing page</li>
        </ResourceMenuItemGroup>
      </Providers>,
    );
    expect(screen.getByText("Landing page")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Content" }));
    expect(screen.queryByText("Landing page")).toBeNull();
    expect(screen.queryByRole("link", { name: /posts/i })).toBeNull();
  });

  it("renders children in a group that has no resources", () => {
    render(
      <Providers>
        <ResourceMenuItemGroup label="Team" resources={[]}>
          <li>Team page</li>
        </ResourceMenuItemGroup>
      </Providers>,
    );
    expect(screen.getByText("Team page")).toBeTruthy();
  });
});
