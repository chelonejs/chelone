import { MenuItemLink } from "@chelone/react";
import { Settings } from "lucide-react";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";

/** `<MenuItemLink>` is one sidebar row: an icon, a label, and the `<kbd>` hint that navigates to the same route when pressed. */
export default function MenuItemLinkDemo() {
  return (
    <SidebarProvider className="min-h-0">
      <SidebarMenu className="w-56">
        <MenuItemLink
          to="/settings"
          label="Settings"
          icon={<Settings />}
          keyboardShortcut="mod+,"
        />
      </SidebarMenu>
    </SidebarProvider>
  );
}
