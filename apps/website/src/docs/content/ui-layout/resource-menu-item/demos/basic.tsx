import { ResourceMenuItem } from "@chelone/react";
import { SidebarMenu } from "@/components/ui/sidebar";
import { PreviewSidebarProvider } from "@/docs/mdx/preview-sidebar-provider";

/** `<ResourceMenuItem>` is a sidebar link to the posts list. */
export default function ResourceMenuItemDemo() {
  return (
    <PreviewSidebarProvider className="min-h-0 w-56">
      <SidebarMenu>
        <ResourceMenuItem name="posts" />
      </SidebarMenu>
    </PreviewSidebarProvider>
  );
}
