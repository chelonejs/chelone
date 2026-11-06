import { AppBar, Title } from "@chelone/react";
import { SidebarProvider } from "@/components/ui/sidebar";

/** `<AppBar>` shows a sidebar toggle, page title, and theme menu. */
export default function AppBarDemo() {
  return (
    <SidebarProvider className="min-h-0 w-full">
      <AppBar userMenu={false} className="w-full rounded-md border" />
      <Title title="Posts" />
    </SidebarProvider>
  );
}
