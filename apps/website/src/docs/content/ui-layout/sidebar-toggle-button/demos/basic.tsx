import { SidebarToggleButton } from "@chelone/react";
import { SidebarProvider } from "@/components/ui/sidebar";

/** `<SidebarToggleButton>` is the icon button that opens and closes the sidebar. */
export default function SidebarToggleButtonDemo() {
  return (
    <SidebarProvider className="min-h-0 w-auto">
      <SidebarToggleButton />
    </SidebarProvider>
  );
}
