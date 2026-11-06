import { ResourceMenuItem } from "@chelone/react";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";

/** `<ResourceMenuItem>` is a sidebar link to the posts list. */
export default function ResourceMenuItemDemo() {
  return (
    <SidebarProvider className="min-h-0 w-56">
      <SidebarMenu>
        <ResourceMenuItem name="posts" />
      </SidebarMenu>
    </SidebarProvider>
  );
}
