import { DashboardMenuItem, Menu } from "@chelone/react";
import { SidebarProvider } from "@/components/ui/sidebar";

/** `<DashboardMenuItem>` shows a home icon and a link to the dashboard. */
export default function DashboardMenuItemDemo() {
  return (
    <SidebarProvider className="min-h-0 w-60 rounded-md border">
      <Menu>
        <DashboardMenuItem />
      </Menu>
    </SidebarProvider>
  );
}
