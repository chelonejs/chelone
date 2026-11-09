"use client";

/**
 * `/admin` — the chelone shell mounted on Next's own router. `routes={false}`
 * keeps every URL with the app routes: `<Admin>` gates, lays out and registers
 * the resources, and `NextOutletProvider` hands it the page Next rendered in
 * the layout's `children`, shown where a route table would render the match.
 *
 * It holds one `QueryClient` and one data provider for the browser session.
 * `staleTime: Infinity` because a server component prefetched what the page
 * renders, so a mount must not refetch it; a mutation still invalidates.
 */

import { type DataProvider, fakeDataProvider } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import { Admin, Resource } from "@chelone/react";
import { NextOutletProvider, nextRouterAdapter } from "@chelone/react/next";
import { QueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { type NextDemoResources, resources } from "./resources";

export interface AdminShellProps {
  /** The page Next hands the layout. */
  children: ReactNode;
  /** The browser's provider, seeded like the server's; a test passes its own. */
  dataProvider?: DataProvider<NextDemoResources>;
}

function AdminLayout({ children }: { children?: ReactNode }) {
  return (
    <div data-testid="next-demo-layout">
      <nav>
        <Link href="/admin/posts">Posts</Link>
        <Link href="/admin/comments">Comments</Link>
      </nav>
      {children}
    </div>
  );
}

export function AdminShell({ children, dataProvider }: AdminShellProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      }),
  );
  const [provider] = useState(
    () => dataProvider ?? fakeDataProvider<NextDemoResources>(seedData()),
  );
  return (
    <NextOutletProvider outlet={children}>
      <Admin
        router={nextRouterAdapter}
        routes={false}
        basename="/admin"
        dataProvider={provider}
        queryClient={queryClient}
        resources={resources}
      >
        <Resource name="posts" hasList hasEdit />
        <Resource name="comments" hasList />
        <Admin.Layout>
          <AdminLayout />
        </Admin.Layout>
      </Admin>
    </NextOutletProvider>
  );
}
