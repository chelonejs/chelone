import { Link } from "react-router";
import { Brand } from "@/components/brand";
import { links } from "./constants";

/** Landing-page footer: brand mark, primary nav links, and copyright line. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 text-sm sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <Brand />

        <nav className="flex items-center gap-6">
          <a
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Link
            to={links.docs}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          {/* Hard nav: the demo is a separate SPA at /demo/, not a react-router
              route — a <Link> would be intercepted and 404 (decision B). */}
          <a
            href={links.demo}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Demo
          </a>
        </nav>

        <p className="text-muted-foreground">
          © 2026 Chelone. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
