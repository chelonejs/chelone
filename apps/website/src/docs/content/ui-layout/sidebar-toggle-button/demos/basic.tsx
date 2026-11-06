import { SidebarToggleButton } from "@chelone/react";
import { PreviewSidebarProvider } from "@/docs/mdx/preview-sidebar-provider";

/** `<SidebarToggleButton>` is the icon button that opens and closes the sidebar; here it drives the docs sidebar. */
export default function SidebarToggleButtonDemo() {
  return (
    <PreviewSidebarProvider className="min-h-0 w-auto">
      <SidebarToggleButton />
    </PreviewSidebarProvider>
  );
}
