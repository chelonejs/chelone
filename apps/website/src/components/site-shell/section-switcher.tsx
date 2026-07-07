import { BookOpen, ChevronsUpDown, Home } from "lucide-react";
import * as React from "react";
import { Link, useLocation } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Section {
  label: string;
  href: string;
  icon: React.ElementType;
}

// Home + Docs only. The reference admin app is a standalone deploy (decision B)
// linked from the marketing pages, not a section of this SSG site.
const SECTIONS: Section[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Docs", href: "/docs", icon: BookOpen },
];

function getActiveSection(pathname: string): Section {
  if (pathname.startsWith("/docs")) return SECTIONS[1];
  return SECTIONS[0];
}

export function SectionSwitcher() {
  const { pathname } = useLocation();
  const { isMobile } = useSidebar();
  const [open, setOpen] = React.useState(false);

  const active = getActiveSection(pathname);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-brand-gradient flex aspect-square size-8 items-center justify-center rounded-lg text-white">
                <active.icon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">
                  Chelone
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {active.label}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = section.href === active.href;
              return (
                <DropdownMenuItem key={section.href} asChild>
                  <Link
                    to={section.href}
                    className="flex items-center gap-2"
                    data-active={isActive || undefined}
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <Icon className="size-4 shrink-0" />
                    </div>
                    <span className={isActive ? "font-medium" : undefined}>
                      {section.label}
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
