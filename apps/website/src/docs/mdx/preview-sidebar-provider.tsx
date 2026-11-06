import { type ComponentProps, useSyncExternalStore } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  getSidebarOpen,
  getSidebarOpenServer,
  setSidebarOpen,
  subscribeSidebar,
} from "../../components/site-shell/sidebar-state";

/**
 * The `<SidebarProvider>` a sidebar demo mounts.
 *
 * Every `<SidebarProvider>` writes the `sidebar_state` cookie and listens for
 * Ctrl/Cmd+B. An uncontrolled one in a demo would write its own state next to
 * the site shell's, and a reload would restore the wrong one. This one reads and
 * writes the site shell's shared state instead, so the demo and the site
 * sidebar always agree.
 */
export function PreviewSidebarProvider(
  props: Omit<ComponentProps<typeof SidebarProvider>, "open" | "onOpenChange">,
) {
  const open = useSyncExternalStore(
    subscribeSidebar,
    getSidebarOpen,
    getSidebarOpenServer,
  );
  return (
    <SidebarProvider {...props} open={open} onOpenChange={setSidebarOpen} />
  );
}
