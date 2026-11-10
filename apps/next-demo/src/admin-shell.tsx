"use client";

/**
 * `/admin` — the chelone shell mounted on Next's own router. `routes={false}`
 * keeps every URL with the app routes: `<Admin>` gates, lays out and registers
 * the resources, and `NextOutletProvider` hands it the page Next rendered in
 * the layout's `children`, shown where a route table would render the match.
 *
 * It holds one `QueryClient` and one data provider for the browser session.
 * `staleTime: Infinity` because a server component prefetched what the page
 * renders, so a mount must not refetch it; a mutation still invalidates. After
 * a browser write the server's prefetch is stale, so `<Prefetched>` ignores it.
 *
 * The proxy keeps a logged-out visit out. The layout reads the cookie and
 * hands the shell `session`, so the browser's provider agrees with the server
 * on the first render. `requireAuth` covers this shell's own sign-out, which
 * clears the cookie through a server action and falls to the login slot until
 * the navigation lands. A session ended elsewhere, such as another tab, is
 * not seen here: the browser's answer is set once from `session`, and the
 * next navigation that reaches the proxy catches it.
 */

import {
  type AuthProvider,
  createStore,
  type DataProvider,
  fakeDataProvider,
} from "@chelone/core";
import {
  makeDemoAuthProvider,
  SIGNED_IN_KEY,
  seedData,
  USER_KEY,
} from "@chelone/demo-data";
import { Admin, Resource } from "@chelone/react";
import { NextOutletProvider, nextRouterAdapter } from "@chelone/react/next";
import { QueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import type { Session } from "./auth";
import { watchWrites } from "./prefetched";
import { type NextDemoResources, resources } from "./resources";
import { signOut } from "./session-actions";

export interface AdminShellProps {
  /** The page Next hands the layout. */
  children: ReactNode;
  /** Who the cookie says is signed in, or `null`; read on the server. */
  session: Session | null;
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

export function AdminShell({
  children,
  session,
  dataProvider,
}: AdminShellProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    watchWrites(client);
    return client;
  });
  const [provider] = useState(
    () => dataProvider ?? fakeDataProvider<NextDemoResources>(seedData()),
  );
  const [authProvider] = useState((): AuthProvider => {
    const store = createStore();
    store.setItem(SIGNED_IN_KEY, session !== null);
    if (session) store.setItem(USER_KEY, session.user);
    const demo = makeDemoAuthProvider(store, queryClient);
    return {
      ...demo,
      logout: async () => {
        await signOut();
        await demo.logout();
        // A hard navigation: Next's client router cache would restore a
        // signed-in page on Back without a request, so the proxy never runs.
        window.location.replace("/login");
      },
    };
  });
  return (
    <NextOutletProvider outlet={children}>
      <Admin
        router={nextRouterAdapter}
        routes={false}
        basename="/admin"
        dataProvider={provider}
        authProvider={authProvider}
        requireAuth
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
