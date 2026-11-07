import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { links } from "@/landing/constants";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/docs", label: "Docs" },
];

// Shared bar: a left brand slot, the nav links, then the theme toggle pinned
// far right. (DocSearch lands with the docs engine in g2.)
function NavBar({ left }: { left: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <nav className="flex h-14 items-center gap-4 px-4">
        {left}
        <ul className="flex items-center gap-4">
          {navLinks.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "text-sm text-muted-foreground hover:text-foreground",
                    isActive && "font-medium text-foreground",
                  )
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
          {/* Hard nav: the demo is a separate SPA at /demo/, not a react-router
              route — a <Link> would be intercepted and 404 (decision B). */}
          <li>
            <a
              href={links.demo}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Demo
            </a>
          </li>
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

// Global nav — hidden on /docs, which renders its own bar inside the docs
// layout (added in g2). The landing (/) shows the brand + top nav.
export function SiteNav() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/docs")) return null;
  return (
    <NavBar
      left={
        <Link to="/" className="flex items-center text-base">
          <Brand />
        </Link>
      }
    />
  );
}
