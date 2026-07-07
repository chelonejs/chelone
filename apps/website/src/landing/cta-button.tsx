import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { ease } from "./constants";

interface CtaButtonProps {
  to: string;
  children: ReactNode;
  /** "brand" = gradient fill (default); "white" = white fill, brand text. */
  variant?: "brand" | "white";
  className?: string;
}

/**
 * Button-in-button CTA — the trailing arrow lives in its own circle that nudges
 * right on hover. Mirrors the "Get started" pattern in docs-index.tsx.
 */
export function CtaButton({
  to,
  children,
  variant = "brand",
  className,
}: CtaButtonProps) {
  const brand = variant === "brand";
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full py-2.5 pl-5 pr-2.5 text-sm font-medium shadow-sm transition-transform duration-300 active:scale-[0.98]",
        brand
          ? "bg-brand-gradient text-white shadow-indigo-500/20"
          : "bg-white text-indigo-600 shadow-black/10",
        className,
      )}
      style={{ transitionTimingFunction: ease }}
    >
      {children}
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5",
          brand ? "bg-white/20" : "bg-indigo-600/10",
        )}
        style={{ transitionTimingFunction: ease }}
      >
        <ArrowRight className="size-3.5" strokeWidth={2} />
      </span>
    </Link>
  );
}

interface GhostButtonProps {
  to: string;
  children: ReactNode;
  className?: string;
  /**
   * Render a plain `<a href>` (full-page navigation) instead of a react-router
   * `<Link>`. Needed for the standalone demo at `/demo/` — it's a SEPARATE SPA
   * copied into the static output, not a react-router route, so a `<Link>` would
   * be intercepted by the site's client router and 404 (decision B).
   */
  hardNav?: boolean;
}

/** Secondary outline pill button. */
export function GhostButton({
  to,
  children,
  className,
  hardNav,
}: GhostButtonProps) {
  const classes = cn(
    "inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
    className,
  );
  if (hardNav) {
    return (
      <a href={to} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes}>
      {children}
    </Link>
  );
}
