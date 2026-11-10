"use client";

/**
 * The router adapter the `/rsc` segment navigates through. `app/rsc/layout.tsx`
 * wraps every page in it, so a sort, page or filter link of a `<ServerList>` is
 * a client navigation rather than a page load, and a delete can ask Next to
 * re-render the route.
 */

import { RouterAdapterProvider } from "@chelone/react";
import { nextRouterAdapter } from "@chelone/react/next";
import type { ReactNode } from "react";

export function RscRouter({ children }: { children: ReactNode }) {
  return (
    <RouterAdapterProvider adapter={nextRouterAdapter}>
      {children}
    </RouterAdapterProvider>
  );
}
