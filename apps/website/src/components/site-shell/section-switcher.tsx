import { BookOpen, ChevronsUpDown, Home, MonitorPlay } from "lucide-react";
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
import { links } from "@/landing/constants";

interface Section {
  label: string;
  href: string;
  icon: React.ElementType;
  /**
   * Rendered as a plain anchor instead of a router link: the target is not a
   * route of this site, so the router must not intercept it.
   */
  hardNav?: boolean;
}

// Home + Docs are this site's own sections. The demo is a standalone deploy
// (decision B), so it is listed here as a hard nav, not a route of this SSG site.
const SECTIONS: Section[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Demo", href: links.demo, icon: MonitorPlay, hardNav: true },
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
              const entry = (
                <>
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Icon className="size-4 shrink-0" />
                  </div>
                  <span className={isActive ? "font-medium" : undefined}>
                    {section.label}
                  </span>
                </>
              );
              return (
                <DropdownMenuItem key={section.href} asChild>
                  {section.hardNav ? (
                    <a
                      href={section.href}
                      className="flex items-center gap-2"
                      data-active={isActive || undefined}
                    >
                      {entry}
                    </a>
                  ) : (
                    <Link
                      to={section.href}
                      className="flex items-center gap-2"
                      data-active={isActive || undefined}
                    >
                      {entry}
                    </Link>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
