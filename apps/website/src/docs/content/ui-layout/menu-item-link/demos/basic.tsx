import { MenuItemLink } from "@chelone/react";
import { BookOpen } from "lucide-react";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";

/** `<MenuItemLink>` is one sidebar row, here for the page you are reading: an icon, its label, the `<kbd>` shortcut hint, and the active highlight `useMatch` gives the current route. */
export default function MenuItemLinkDemo() {
  return (
    <SidebarProvider className="min-h-0">
      <SidebarMenu className="w-56">
        <MenuItemLink
          to="/docs/ui-layout/menu-item-link"
          label="MenuItemLink"
          icon={<BookOpen />}
          keyboardShortcut="mod+,"
        />
      </SidebarMenu>
    </SidebarProvider>
  );
}
