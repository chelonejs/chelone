/**
 * Start's router entry: Start calls `getRouter()` once per request (server) and
 * once on the client, and overrides the router's history per request itself. So
 * this file owns only what must be fresh per request — the `QueryClient`, the
 * `fakeDataProvider` (which clones its seed) and the router context that carries
 * both into every loader.
 *
 * The session is fresh per request too, which is why `getRouter()` is async and
 * Start awaits it on both sides: the read goes through a server function, which
 * answers from the request's own `start-demo-session` cookie. A test passes its
 * own gateway instead and needs no server.
 *
 * `wrapQueryClient: false` because `<Admin>` already mounts chelone's
 * `CheloneProvider`, which provides this same client to the tree.
 */

import { createNotificationStore, fakeDataProvider } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import {
  cookieSessionGateway,
  makeSessionAuthProvider,
  type SessionGateway,
} from "./auth";
import type { StartDemoResources } from "./resources";
import type { StartDemoContext } from "./routes/__root";
import { routeTree } from "./routeTree.gen";

export interface StartRouterOptions {
  /** Where the router's session comes from. Defaults to the cookie. */
  sessionGateway?: SessionGateway;
}

export async function getRouter(options: StartRouterOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // The loaders prefetch what the pages render, so a mount must not refetch
        // what the loader already fetched — on the server or after hydration.
        staleTime: Infinity,
      },
    },
  });
  const dataProvider = fakeDataProvider<StartDemoResources>(seedData());
  const authProvider = await makeSessionAuthProvider(
    queryClient,
    options.sessionGateway ?? cookieSessionGateway,
  );
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      dataProvider,
      authProvider,
      notifications: createNotificationStore(),
    } satisfies StartDemoContext,
  });
  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    wrapQueryClient: false,
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: Awaited<ReturnType<typeof getRouter>>;
  }
}
