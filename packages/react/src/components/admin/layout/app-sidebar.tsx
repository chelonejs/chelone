/**
 * `<AppSidebar>` — the navigation sidebar. Ported from shadmin
 * `layout/app-sidebar.tsx`; the seam (react-router's `Link`) is rewired to the
 * router adapter's `Link`.
 *
 * Chelone divergence: the hard-coded "Acme Inc." placeholder brand is replaced
 * by a generic default (`Chelone` + the `Shell` icon) that is overridable via
 * the `brand` / `brandIcon` / `brandTo` props (so an app author brands the
 * sidebar without re-implementing it).
 */

import { Shell } from "lucide-react";
import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cssVars } from "@/lib/css-vars";
import { useBasename } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { Menu } from "./menu";

export interface AppSidebarProps {
  /**
   * Replaces the default `<Menu />` rendered inside the content area. Pass a
   * custom navigation tree for full control over sidebar items.
   */
  children?: ReactNode;
  /**
   * Width of the sidebar in its open/expanded state, in pixels. Defaults to 240.
   */
  size?: number;
  /**
   * Width of the sidebar in its collapsed/icon-only state, in pixels.
   * Defaults to 48: the 32px icon button plus the 8px padding on each side.
   */
  closedSize?: number;
  /**
   * When `true`, signals that the AppBar is always visible (not hidden on
   * scroll). Accepted for forward-compat; not otherwise consumed here.
   */
  appBarAlwaysOn?: boolean;
  /** Brand label rendered in the sidebar header. Defaults to `"Chelone"`. */
  brand?: ReactNode;
  /** Brand icon rendered before the label. Defaults to the `Shell` icon. */
  brandIcon?: ReactNode;
  /**
   * Where the brand links to, used as given (not prefixed with the basename).
   * Defaults to the dashboard under the basename.
   */
  brandTo?: string;
}

/**
 * Navigation sidebar: a brand header, the resource menu, and a footer. Collapses
 * to an icon-only view and renders as a drawer on mobile. Included in the
 * default `<Layout>`.
 *
 * @example
 * import { AppSidebar } from "@chelone/react";
 *
 * <AppSidebar brand="My App" />
 */
function AppSidebar({
  children,
  size = 240,
  closedSize = 48,
  appBarAlwaysOn: _appBarAlwaysOn,
  brand = "Chelone",
  brandIcon,
  brandTo,
}: AppSidebarProps) {
  const { Link } = useRouterAdapter();
  const basename = useBasename();
  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      style={cssVars({
        "--sidebar-width": `${size}px`,
        "--sidebar-width-icon": `${closedSize}px`,
      })}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to={brandTo ?? `${basename}/`}>
                {brandIcon ?? <Shell className="size-5!" />}
                <span className="text-base font-semibold">{brand}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>{children ?? <Menu />}</SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

export { AppSidebar };
