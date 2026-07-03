/**
 * `HasDashboardContext` (plan §0a-7). The authenticated branch wraps the layout
 * tree in this so any descendant (a menu, a breadcrumb) can know whether the
 * app has a dashboard index route — e.g. to render a "Dashboard" menu entry
 * only when one exists. Mirrors ra-core's `<HasDashboard>` provider.
 *
 * Pre-extracted to a `.ts` sibling (no component export) so the shell's `.tsx`
 * files stay component-only (`react-refresh/only-export-components`).
 */

import { createContext, useContext } from "react";

/** Whether the app registered a dashboard (index) route. Default `false`. */
export const HasDashboardContext = createContext<boolean>(false);

/** Read whether the app has a dashboard route (drives conditional menu items). */
export function useHasDashboard(): boolean {
  return useContext(HasDashboardContext);
}
