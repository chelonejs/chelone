import type { ReactNode } from "react";
import { SectionSwitcher } from "@/components/site-shell/section-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

interface SiteSidebarProps {
  /** Replaces the default `<SectionSwitcher />` in the sidebar header. */
  header?: ReactNode;
  /** Navigation content rendered in the sidebar body. */
  children?: ReactNode;
  /** Optional footer content (e.g. NavUser). */
  footer?: ReactNode;
}

/**
 * Shared sidebar shell used by both Docs and Demo layouts.
 * Renders as `collapsible="icon"` (collapses to an icon rail).
 * `SidebarRail` lives here (requires Sidebar context from useSidebar).
 */
export function SiteSidebar({ header, children, footer }: SiteSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>{header ?? <SectionSwitcher />}</SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
