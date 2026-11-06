import { ResourceMenuItemGroup } from "@chelone/react";
import { PreviewSidebarProvider } from "@/docs/mdx/preview-sidebar-provider";

/** `<ResourceMenuItemGroup>` is a collapsible "Content" sidebar section linking to the posts and authors lists. */
export default function ResourceMenuItemGroupDemo() {
  return (
    <PreviewSidebarProvider className="min-h-0 w-56">
      <ResourceMenuItemGroup label="Content" resources={["posts", "authors"]} />
    </PreviewSidebarProvider>
  );
}
