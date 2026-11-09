/**
 * The document shell every Start route renders inside, plus the router context
 * type the whole app shares: the per-request `QueryClient` and the
 * `fakeDataProvider` `getRouter()` built, both read by loaders
 * (`ensureQueryData`) and by `<Admin>` below them.
 */

import type { DataProvider } from "@chelone/core";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { StartDemoResources } from "../resources";

export interface StartDemoContext {
  queryClient: QueryClient;
  dataProvider: DataProvider<StartDemoResources>;
}

export const Route = createRootRouteWithContext<StartDemoContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Chelone — TanStack Start demo</title>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
