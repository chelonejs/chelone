import { AppSidebar } from "@chelone/react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

/** `<AppSidebar>` shows the brand and resource links in a collapsible sidebar. */
export default function AppSidebarDemo() {
  return (
    <SidebarProvider className="relative isolate min-h-80 w-full overflow-hidden rounded-md border [&_[data-slot=sidebar-container]]:absolute [&_[data-slot=sidebar-container]]:h-full">
      <AppSidebar />
      <div className="flex-1 p-4">
        <SidebarTrigger />
        <p className="mt-4 text-sm text-muted-foreground">
          Browse posts and authors from the sidebar.
        </p>
      </div>
    </SidebarProvider>
  );
}
