import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  /** Mark size in px (the wordmark scales with the parent font-size). */
  markSize?: number;
}

/**
 * The Chelone wordmark: gradient mark glyph + "chel" (themed) / "one" (gradient).
 * Theme-adaptive — the "chel" text follows `--foreground`, so it reads on both
 * light and dark backgrounds.
 */
export function Brand({ className, markSize = 24 }: BrandProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <img
        src="/chelone-mark.svg"
        alt=""
        aria-hidden
        width={markSize}
        height={markSize}
        style={{ width: markSize, height: markSize }}
        className="shrink-0"
      />
      <span className="text-foreground">
        chel<span className="text-brand-gradient">one</span>
      </span>
    </span>
  );
}
