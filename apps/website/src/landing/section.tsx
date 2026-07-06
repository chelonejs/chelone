import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RevealItem } from "./reveal";

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

/** Gradient eyebrow pill before an H2 — matches the /docs landing. */
export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <RevealItem
      as="span"
      className={cn(
        "inline-block rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gradient",
        className,
      )}
    >
      {children}
    </RevealItem>
  );
}

interface HeadingProps {
  children: ReactNode;
  className?: string;
}

/** Section H2 — bold, tight tracking, reveals as a stagger item. */
export function Heading({ children, className }: HeadingProps) {
  return (
    <RevealItem
      as="h2"
      className={cn(
        "mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl",
        className,
      )}
    >
      {children}
    </RevealItem>
  );
}

interface LeadProps {
  children: ReactNode;
  className?: string;
}

/** Section sub-paragraph below the heading. */
export function Lead({ children, className }: LeadProps) {
  return (
    <RevealItem
      as="p"
      className={cn(
        "mt-4 text-lg leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {children}
    </RevealItem>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/** Vertical-rhythm wrapper: generous py + centered max-width container. */
export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn("py-24 md:py-32", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/**
 * Section-to-section divider: a thin violet→indigo brand-gradient rule that
 * fades out at both ends (edge mask). No center node — just a soft colour seam.
 */
export function SectionDivider() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6" aria-hidden>
      <div className="h-0.5 w-full bg-[linear-gradient(to_right,var(--brand-from),var(--brand-to))] [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]" />
    </div>
  );
}

interface LogoChipProps {
  label: string;
  src: string;
  /** Render the icon as a theme-adaptive silhouette (brightness-0 dark:invert). */
  silhouette?: boolean;
}

/** Pill chip with a backend/host logo + label, used in the integration rows. */
export function LogoChip({ label, src, silhouette }: LogoChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-sm font-medium text-foreground">
      <img
        src={src}
        alt=""
        aria-hidden
        width={18}
        height={18}
        className={cn("size-[18px]", silhouette && "brightness-0 dark:invert")}
      />
      {label}
    </span>
  );
}

interface BezelPanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Double-bezel frame for hero/feature mockups: a soft outer ring around an inset
 * card surface, giving screenshots/code/diagrams depth. Renders as a `Reveal`
 * stagger child so it animates in when it scrolls into view.
 */
export function BezelPanel({ children, className }: BezelPanelProps) {
  return (
    <RevealItem
      className={cn(
        "rounded-2xl bg-muted/40 p-1.5 ring-1 ring-border/60",
        className,
      )}
    >
      {children}
    </RevealItem>
  );
}
