import { type ReactNode, useSyncExternalStore } from "react";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  getSidebarOpen,
  getSidebarOpenServer,
  setSidebarOpen,
  subscribeSidebar,
} from "./sidebar-state";

interface SiteShellProps {
  /** The sidebar element — pass `<SiteSidebar>` (already contains SidebarRail). */
  sidebar: ReactNode;
  /**
   * Breadcrumb rendered in the inset header.
   * Also wrapped in `id="breadcrumb"` so the Demo's ra-core breadcrumb portal
   * has a mount target.
   */
  breadcrumb?: ReactNode;
  /** Right-aligned action buttons / controls in the inset header. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Top-level shell shared by Docs and Demo.
 *
 * Renders:
 *   SidebarProvider
 *     {sidebar}          ← caller passes <SiteSidebar> (includes SidebarRail inside)
 *     SidebarInset
 *       header           ← SidebarTrigger | Separator | breadcrumb | actions
 *       {children}
 *
 * Note: SidebarRail is NOT rendered here — it must live inside <Sidebar> to access
 * useSidebar(). Pass a <SiteSidebar> (which includes <SidebarRail/>) as `sidebar`.
 */
export function SiteShell({
  sidebar,
  breadcrumb,
  actions,
  children,
}: SiteShellProps) {
  // Controlled by the shared, persisted store so docs ⇄ demo navigation keeps
  // the same open/collapsed state and it survives reloads (see sidebar-state).
  const open = useSyncExternalStore(
    subscribeSidebar,
    getSidebarOpen,
    getSidebarOpenServer,
  );
  return (
    // h-svh + overflow-hidden locks the shell to the viewport so the sidebar
    // (fixed) and the inset header stay put; scrolling is delegated to the
    // content region below. SiteNav is hidden on /docs and /demo, so this owns
    // the full viewport there — the landing page (which needs document scroll)
    // never mounts SiteShell.
    <SidebarProvider
      open={open}
      onOpenChange={setSidebarOpen}
      className="h-svh overflow-hidden"
    >
      {sidebar}
      <SidebarInset className="min-h-0">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="!h-4" />
          <div id="breadcrumb" className="flex flex-1 items-center gap-2">
            {breadcrumb}
          </div>
          {actions && (
            <div className="ml-auto flex items-center gap-2">{actions}</div>
          )}
        </header>
        {/* The only scroll container: both axes scroll here, keeping the
            chrome fixed. min-h-0 lets this flex child shrink below content. */}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
