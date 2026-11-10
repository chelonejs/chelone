/**
 * Layout of every `/rsc` route. One `RouterAdapterProvider` here covers the
 * client islands below it (`ServerListFilters`, `ServerListDeleteButton`) and
 * the server list's links, so each navigates on the client through TanStack
 * Router instead of loading a page.
 */

import { RouterAdapterProvider } from "@chelone/react";
import { tanstackHostRouterAdapter } from "@chelone/react/tanstack-router";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/rsc")({
  component: RscLayout,
});

function RscLayout() {
  return (
    <RouterAdapterProvider adapter={tanstackHostRouterAdapter}>
      <Outlet />
    </RouterAdapterProvider>
  );
}
