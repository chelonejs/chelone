import { Menu } from "@chelone/react";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@/components/ui/sidebar";

/** `<Menu>` lists every resource with a list view, here the preview's seeded `posts` and `authors`, as sidebar links. */
export default function MenuDemo() {
  return (
    <SidebarProvider className="min-h-0">
      <Sidebar collapsible="none" className="w-56">
        <SidebarContent>
          <Menu />
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
