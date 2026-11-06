import { ResourceMenuItemGroup } from "@chelone/react";
import { SidebarProvider } from "@/components/ui/sidebar";

/** `<ResourceMenuItemGroup>` is a collapsible "Content" sidebar section linking to the posts and authors lists. */
export default function ResourceMenuItemGroupDemo() {
  return (
    <SidebarProvider className="min-h-0 w-56">
      <ResourceMenuItemGroup label="Content" resources={["posts", "authors"]} />
    </SidebarProvider>
  );
}
