/**
 * `/admin` — the chelone shell mounted on Start's own router. `routes={false}`
 * keeps every URL with the file routes under this one: `<Admin>` gates, lays
 * out and registers the resources, and renders the matched child route where
 * its own route table would sit. A bare `/admin` has no child to render, so it
 * redirects to the first resource.
 */

import { Admin, Resource } from "@chelone/react";
import { tanstackHostRouterAdapter } from "@chelone/react/tanstack-router";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { resources } from "../resources";

export const Route = createFileRoute("/admin")({
  // Parent `beforeLoad` runs for a descendant match too, so the redirect is
  // gated on the pathname actually being the shell's own — `/admin/posts`
  // reaches this file without redirecting.
  beforeLoad: ({ location }) => {
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
  const { dataProvider, queryClient } = Route.useRouteContext();
  return (
    <Admin
      router={tanstackHostRouterAdapter}
      routes={false}
      basename="/admin"
      dataProvider={dataProvider}
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
