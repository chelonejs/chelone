/**
 * R2 — CRUD-BUTTON + RESOURCE-MENU-ITEM access gating (React adapter). The
 * `<CanAccess>` component gate is covered in `auth-r2.test.tsx`; this pins the
 * SAME fail-safe `useMenuAccess` contract as consumed by the surface the user
 * actually clicks:
 *
 *  - a `<CreateButton>` (a CRUD action button) hides when `canAccess({action:
 *    "create"})` is false, shows when true, and shows when access control is
 *    unconfigured (no `canAccess` on the provider).
 *  - a `<ResourceMenuItem>` (the sidebar entry) hides when `canAccess({action:
 *    "list"})` is false, shows when true, and shows when unconfigured.
 *
 * The "unconfigured ⇒ shown" case is the load-bearing fail-OPEN assertion: an
 * app that never wired access control must never lock itself out of its own
 * navigation + actions.
 */

import {
  type AuthProvider,
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CheloneProvider } from "../../context";
import { ResourceRegistryProvider } from "../../resource";
import { RouterAdapterProvider } from "../../router/adapter";
import { reactRouterAdapter } from "../../router/react-router-adapter";
import { CreateButton } from "./buttons/create-button";
import { ResourceMenuItem } from "./layout/resource-menu-item";

afterEach(cleanup);

const baseAuth = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...over,
});

function Providers({
  children,
  authProvider,
}: {
  children: ReactNode;
  authProvider?: AuthProvider;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: true,
    hasEdit: true,
    hasShow: true,
  });
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({ "chelone.action.create": "Create" }),
    },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      authProvider={authProvider}
      i18n={i18n}
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

describe("<CreateButton> access gating", () => {
  it("hides when create access is denied", async () => {
    render(
      <Providers authProvider={baseAuth({ canAccess: async () => false })}>
        <CreateButton resource="posts" />
      </Providers>,
    );
    // Allow the (disabled→enabled) canAccess query to settle, then assert absent.
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /create/i })).toBeNull(),
    );
  });

  it("shows when create access is granted", async () => {
    render(
      <Providers authProvider={baseAuth({ canAccess: async () => true })}>
        <CreateButton resource="posts" />
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /create/i })).toBeTruthy(),
    );
  });

  it("shows when access control is unconfigured (no canAccess)", () => {
    render(
      <Providers authProvider={baseAuth()}>
        <CreateButton resource="posts" />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: /create/i })).toBeTruthy();
  });
});

describe("<ResourceMenuItem> access gating", () => {
  it("hides when list access is denied", async () => {
    render(
      <Providers authProvider={baseAuth({ canAccess: async () => false })}>
        <ResourceMenuItem name="posts" />
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /posts/i })).toBeNull(),
    );
  });

  it("shows when list access is granted", async () => {
    render(
      <Providers authProvider={baseAuth({ canAccess: async () => true })}>
        <ResourceMenuItem name="posts" />
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy(),
    );
  });

  it("shows when access control is unconfigured (no canAccess)", () => {
    render(
      <Providers authProvider={baseAuth()}>
        <ResourceMenuItem name="posts" />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
  });
});
