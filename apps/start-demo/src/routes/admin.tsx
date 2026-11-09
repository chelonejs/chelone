/**
 * `/admin` — the chelone shell mounted on Start's own router. `routes={false}`
 * keeps every URL with the file routes under this one: `<Admin>` gates, lays
 * out and registers the resources, and renders the matched child route where
 * its own route table would sit. A bare `/admin` has no child to render, so it
 * redirects to the first resource.
 *
 * `requireAuthBeforeLoad` runs before any of that: a logged-out visit throws a
 * redirect to `/login` before this route renders, so no page loader runs and no
 * data is fetched for a visitor who never sees the page.
 */

import { Admin, Resource } from "@chelone/react";
import {
  requireAuthBeforeLoad,
  tanstackHostRouterAdapter,
} from "@chelone/react/tanstack-router";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { resources } from "../resources";

export const Route = createFileRoute("/admin")({
  // Parent `beforeLoad` runs for a descendant match too, so the redirect is
  // gated on the pathname actually being the shell's own — `/admin/posts`
  // reaches this file without redirecting.
  beforeLoad: async ({ context, location }) => {
    await requireAuthBeforeLoad({
      location,
      authProvider: context.authProvider,
      queryClient: context.queryClient,
    });
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({ to: "/admin/posts", replace: true });
    }
  },
  component: AdminShell,
});

function AdminLayout({ children }: { children?: ReactNode }) {
  return (
    <div data-testid="start-demo-layout">
      <nav>
        <Link to="/admin/posts">Posts</Link>
        <Link to="/admin/comments">Comments</Link>
      </nav>
      {children}
    </div>
  );
}

function AdminShell() {
  const { authProvider, dataProvider, notifications, queryClient } =
    Route.useRouteContext();
  return (
    <Admin
      router={tanstackHostRouterAdapter}
      routes={false}
      basename="/admin"
      authProvider={authProvider}
      requireAuth
      dataProvider={dataProvider}
      notifications={notifications}
      queryClient={queryClient}
      resources={resources}
    >
      <Resource name="posts" hasList hasEdit />
      <Resource name="comments" hasList />
      <Admin.Layout>
        <AdminLayout />
      </Admin.Layout>
    </Admin>
  );
}
